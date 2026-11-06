'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const db = require('../src/database/db');
const {gerarToken} = require('../src/services/authService');
const {validarItens} = require('../src/services/ordemService');
const fs = require('node:fs');
const path = require('node:path');

const auth = (id,perfil) => gerarToken({id,perfil,nome:'Teste',email:`${id}@exemplo.test`});
const oficina = auth(11,'oficina'), outraOficina = auth(12,'oficina');
const cliente = auth(21,'cliente'), outroCliente = auth(22,'cliente');
const resultado = rows => ({rows,rowCount:rows.length});
class BancoSimulado {
  constructor(){this.reset();}
  reset(){
    this.ag={id:1,status:'agendado',oficinaUsuarioId:11,clienteUsuarioId:21};
    this.ordens=[];this.itens=[];this.eventos=[];this.novaOrdem=1;this.novoItem=1;this.snapshot=null;
  }
  async query(sql,p=[]){
    const q=sql.replace(/\s+/g,' ').trim();
    if(q==='BEGIN'){this.snapshot=structuredClone({ag:this.ag,ordens:this.ordens,itens:this.itens,eventos:this.eventos,novaOrdem:this.novaOrdem,novoItem:this.novoItem});return resultado([]);}
    if(q==='COMMIT'){this.snapshot=null;return resultado([]);}
    if(q==='ROLLBACK'){if(this.snapshot)Object.assign(this,structuredClone(this.snapshot));this.snapshot=null;return resultado([]);}
    if(q.startsWith('SELECT a.id, a.status, o.usuario_id'))return resultado(this.ag.id===p[0]&&this.ag.oficinaUsuarioId===p[1]?[{id:1,status:this.ag.status,oficinaUsuarioId:11}]:[]);
    if(q.startsWith('SELECT id FROM ordens_servico WHERE agendamento_id='))return resultado(this.ordens.filter(o=>o.agendamento_id===p[0]).map(o=>({id:o.id})));
    if(q.startsWith('UPDATE agendamentos SET status=')){this.ag.status='recebido';return resultado([{}]);}
    if(q.startsWith('INSERT INTO ordens_servico')){const ordem={id:this.novaOrdem++,agendamento_id:p[0],status:'recebido',diagnostico:null,
       orcamento_versao:0,versao_aprovada:null,decisao_orcamento:null,decisao_em:null,motivo_recusa:null,motivo_cancelamento:null};this.ordens.push(ordem);return resultado([{id:ordem.id}]);}
    if(q.startsWith('INSERT INTO ordem_eventos')){this.eventos.push({ordemId:p[0],usuarioId:p[1],acao:p[2],antes:p[3],depois:p[4]});return resultado([]);}
    if(q.startsWith('SELECT os.*')){const ordem=this.ordens.find(x=>x.id===p[0]);return resultado(ordem&&this.acesso(p[1],p[2])?[structuredClone(ordem)]:[]);}
    if(q.startsWith('SELECT os.id, os.agendamento_id')){
      const ordem=this.ordens.find(x=>x.id===p[0]);return resultado(ordem&&this.acesso(p[1],p[2])?[{
        id:ordem.id,agendamentoId:1,status:ordem.status,diagnostico:ordem.diagnostico,
        orcamentoVersao:ordem.orcamento_versao,versaoAprovada:ordem.versao_aprovada,
        decisaoOrcamento:ordem.decisao_orcamento,motivoRecusa:ordem.motivo_recusa,
        motivoCancelamento:ordem.motivo_cancelamento,data:'2099-11-09',horarioInicio:'08:00',
        oficinaNome:'Oficina Teste',clienteNome:'Cliente Teste',veiculoPlaca:'ABC1D23',veiculoMarca:'Fiat',
        veiculoModelo:'Argo',servicoNome:'Troca de óleo',statusAgendamento:this.ag.status
      }]:[]);}
    if(q.startsWith('SELECT id, tipo, descricao, quantidade::float8'))return resultado(this.itens.filter(i=>i.ordem_id===p[0]).map(i=>({id:i.id,tipo:i.tipo,descricao:i.descricao,
      quantidade:Number(i.quantidade),valorUnitario:Number(i.valor_unitario),subtotal:Number(i.quantidade)*Number(i.valor_unitario)})));
    if(q.startsWith('SELECT os.id FROM ordens_servico'))return resultado(this.acesso(p[0],p[1])?this.ordens.map(x=>({id:x.id})):[]);
    if(q.startsWith('DELETE FROM orcamento_itens')){this.itens=this.itens.filter(x=>x.ordem_id!==p[0]);return resultado([]);}
    if(q.startsWith('INSERT INTO orcamento_itens')){this.itens.push({id:this.novoItem++,ordem_id:p[0],tipo:p[1],descricao:p[2],quantidade:p[3],valor_unitario:p[4]});return resultado([]);}
    if(q.startsWith('SELECT COUNT(*)::int AS total FROM orcamento_itens'))return resultado([{total:this.itens.filter(x=>x.ordem_id===p[0]).length}]);
    if(q.startsWith('UPDATE ordens_servico')){
      const o=this.ordens.find(x=>x.id===p[0]);if(!o)throw Error('Ordem inexistente no mock');
      if(q.includes('SET diagnostico=')){o.diagnostico=p[1];o.status='diagnostico';}
      else if(q.includes("SET status='orcamento'")){o.status='orcamento';o.orcamento_versao=p[1];o.versao_aprovada=null;o.decisao_orcamento=null;o.motivo_recusa=null;}
      else if(q.includes("SET status='aguardando_aprovacao'")){o.status='aguardando_aprovacao';o.decisao_orcamento=null;o.motivo_recusa=null;}
      else if(q.includes('SET status=$2, decisao_orcamento=')){o.status=p[1];o.decisao_orcamento=p[2];o.versao_aprovada=p[3];o.motivo_recusa=p[4];o.motivo_cancelamento=p[5];}
      else if(q.includes('SET status=$2')){o.status=p[1];}
      else if(q.includes("SET status='cancelado'")){o.status='cancelado';o.motivo_cancelamento=p[1];}
      else throw Error('UPDATE desconhecido: '+q);
      return resultado([o]);
    }
    throw Error('SQL desconhecido no mock RF10-RF13: '+q);
  }
  acesso(id,perfil){return perfil==='oficina'?id===11:perfil==='cliente'?id===21:false;}
  async getClient(){return {query:(sql,params)=>this.query(sql,params),release(){}};}
}
const fake=new BancoSimulado();
let server,url;
async function json(rota,{method='GET',token,body}={}){
 const r=await fetch(url+rota,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status, ...await r.json()};
}
const api=(rota,method,token,body)=>json(rota,{method,token,body});
async function receber(){return api('/api/ordens/receber','POST',oficina,{agendamentoId:1});}
async function diagnosticar(){return api('/api/ordens/1/diagnostico','PUT',oficina,{diagnostico:'Correia e filtro precisam de revisão.'});}
async function orcamento(itens=[{tipo:'peca',descricao:'Filtro',quantidade:2,valorUnitario:50},
  {tipo:'mao_de_obra',descricao:'Mão de obra',quantidade:1,valorUnitario:80}]){
 return api('/api/ordens/1/orcamento','PUT',oficina,{itens});
}
async function enviar(){return api('/api/ordens/1/enviar-orcamento','POST',oficina);}
async function setupAguardando(){assert.equal((await receber()).status,201);assert.equal((await diagnosticar()).status,200);
 assert.equal((await orcamento()).status,200);assert.equal((await enviar()).status,200);}
async function aprovar(){return api('/api/ordens/1/decisao','POST',cliente,{decisao:'aprovado'});}

test.before(async()=>{db.setCustomExecutor(fake);server=app.listen(0);await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(r=>server.close(r));db.setCustomExecutor(null);});
test.beforeEach(()=>fake.reset());

test('RF10: apenas oficina proprietária recebe e cria OS vinculada',async()=>{
 assert.equal((await api('/api/ordens/receber','POST',cliente,{agendamentoId:1})).status,403);
 assert.equal((await api('/api/ordens/receber','POST',outraOficina,{agendamentoId:1})).status,404);
 const r=await receber();assert.equal(r.status,201);assert.equal(r.ordem.agendamentoId,1);
 assert.equal(fake.ag.status,'recebido');assert.equal(fake.ordens.length,1);
 assert.equal((await receber()).status,409);assert.equal(fake.ordens.length,1);
 assert.deepEqual(fake.eventos.map(e=>e.acao),['recebido']);
});
test('RF10: agendamento cancelado não pode ser recebido',async()=>{
 fake.ag.status='cancelado';assert.equal((await receber()).status,409);assert.equal(fake.ordens.length,0);
});
test('RF11: diagnóstico é obrigatório e o orçamento soma itens, peças e mão de obra',async()=>{
 await receber();
 assert.equal((await enviar()).status,409);
 assert.equal((await api('/api/ordens/1/diagnostico','PUT',oficina,{diagnostico:''})).status,400);
 assert.equal((await diagnosticar()).status,200);
 const p=await orcamento();assert.equal(p.status,200);assert.equal(p.ordem.total,180);
 assert.equal(p.ordem.maoDeObra,80);assert.equal(p.ordem.orcamentoVersao,1);
 assert.equal((await enviar()).status,200);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'})).status,409);
});
test('RF12: cliente pode aprovar e oficina pode iniciar manutenção somente na mesma versão',async()=>{
 await setupAguardando();
 assert.equal((await api('/api/ordens/1/decisao','POST',outroCliente,{decisao:'aprovado'})).status,404);
 assert.equal((await api('/api/ordens/1/decisao','POST',oficina,{decisao:'aprovado'})).status,403);
 assert.equal((await aprovar()).status,200);
 assert.equal((await aprovar()).status,409);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'})).status,200);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'entregue'})).status,409);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'finalizado'})).status,200);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'entregue'})).status,200);
 assert.equal(fake.ordens[0].status,'entregue');
});

test('RF12 / PostgreSQL 42P08: aprovação e recusa usam booleano tipado para encerramento', async()=>{
 await setupAguardando();
 const consultaOriginal = fake.query;
 let sqlDecisao, parametrosDecisao;
 fake.query = async function(sql, parametros=[]) {
   if (sql.includes('UPDATE ordens_servico SET status=$2, decisao_orcamento=$3')) {
     sqlDecisao = sql;
     parametrosDecisao = parametros;
   }
   return consultaOriginal.call(this, sql, parametros);
 };
 try {
   assert.equal((await aprovar()).status,200);
   assert.match(sqlDecisao, /encerrado_em=CASE WHEN \$7::boolean THEN CURRENT_TIMESTAMP ELSE NULL END/);
   assert.equal(parametrosDecisao[6],false);
   fake.reset();
   await setupAguardando();
   const recusado=await api('/api/ordens/1/decisao','POST',cliente,
     {decisao:'recusado',encerrar:true,motivo:'Teste de recusa'});
   assert.equal(recusado.status,200);
   assert.equal(recusado.ordem.status,'cancelado');
   assert.equal(parametrosDecisao[6],true);
 } finally {
   fake.query = consultaOriginal;
 }
});

test('RF12: orçamento recusado pode ser encerrado de imediato pelo cliente',async()=>{
 await setupAguardando();
 const r=await api('/api/ordens/1/decisao','POST',cliente,{decisao:'recusado',encerrar:true,motivo:'Muito caro'});
 assert.equal(r.status,200);assert.equal(r.ordem.status,'cancelado');
 assert.equal(r.ordem.motivoCancelamento,'Muito caro');
 assert.equal((await aprovar()).status,409);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'})).status,409);
 assert.equal(fake.eventos.at(-1).acao,'recusado_encerrado');
});
test('RF12: cliente pode recusar e encerrar numa segunda ação',async()=>{
 await setupAguardando();
 const r=await api('/api/ordens/1/decisao','POST',cliente,{decisao:'recusado'});
 assert.equal(r.status,200);assert.equal(r.ordem.status,'orcamento');
 assert.equal((await enviar()).status,409); // não é permitido reenviar mesma proposta recusada
 assert.equal((await api('/api/ordens/1/encerrar','POST',cliente,{})).status,200);
 assert.equal(fake.ordens[0].status,'cancelado');
 assert.equal((await api('/api/ordens/1/encerrar','POST',cliente,{})).status,409);
});
test('RN10: editar orçamento revoga aprovação e obriga nova aprovação',async()=>{
 await setupAguardando();await aprovar();
 const p=await orcamento([{tipo:'servico',descricao:'Revisão completa',quantidade:1,valorUnitario:500}]);
 assert.equal(p.status,200);assert.equal(p.ordem.decisaoOrcamento,null);assert.equal(p.ordem.versaoAprovada,null);
 assert.equal(p.ordem.orcamentoVersao,2);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'})).status,409);
 assert.equal((await enviar()).status,200);assert.equal((await aprovar()).status,200);
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'})).status,200);
});
test('RN10: alteração durante manutenção exige reaprovação antes de continuar',async()=>{
 await setupAguardando();await aprovar();await api('/api/ordens/1/avancar','POST',oficina,{status:'em_manutencao'});
 const r=await orcamento([{tipo:'peca',descricao:'Peça adicional',quantidade:1,valorUnitario:100}]);
 assert.equal(r.status,200);assert.equal(r.ordem.status,'orcamento');
 assert.equal((await api('/api/ordens/1/avancar','POST',oficina,{status:'finalizado'})).status,409);
});
test('RF13: leitura de O.S. e histórico isolados por propriedade de conta',async()=>{
 await setupAguardando();
 assert.equal((await json('/api/ordens')).status,401);
 assert.equal((await json('/api/ordens/1',{token:outroCliente})).status,404);
 assert.equal((await json('/api/ordens/1',{token:outraOficina})).status,404);
 const r=await json('/api/ordens',{token:cliente});assert.equal(r.status,200);assert.equal(r.ordens.length,1);
 assert.equal(r.ordens[0].total,180);
 assert.equal((await json('/api/ordens',{token:outroCliente})).ordens.length,0);
 assert.equal((await json('/api/ordens',{token:outraOficina})).ordens.length,0);
});
test('RN08: cancelamento excepcional pela oficina exige motivo',async()=>{
 await receber();
 assert.equal((await api('/api/ordens/1/cancelar','POST',oficina,{motivo:''})).status,400);
 const r=await api('/api/ordens/1/cancelar','POST',oficina,{motivo:'Cliente não compareceu'});
 assert.equal(r.status,200);assert.equal(r.ordem.status,'cancelado');
 assert.equal((await api('/api/ordens/1/cancelar','POST',oficina,{motivo:'Outro'})).status,409);
});
test('Validação: orçamento rejeita itens malformados, valores negativos e lista vazia',()=>{
 assert.throws(()=>validarItens([]));
 assert.throws(()=>validarItens([{tipo:'peca',descricao:'Filtro',quantidade:1,valorUnitario:-1}]));
 assert.throws(()=>validarItens([{tipo:'peca',descricao:'',quantidade:1,valorUnitario:10}]));
 assert.throws(()=>validarItens([{tipo:'peca',descricao:'Filtro',quantidade:0,valorUnitario:10}]));
 assert.throws(()=>validarItens([{tipo:'peca',descricao:'Filtro',quantidade:1,valorUnitario:'0.001'}]));
 assert.equal(validarItens([{tipo:'mao_de_obra',descricao:'Montagem',quantidade:1,valorUnitario:50}]).length,1);
});
test('Interface: cliente pode recusar e encerrar; oficina pode registrar recebimento',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/ordens.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/js/ordens.js'),'utf8');
 assert.match(html,/Ordens de serviço/);assert.match(js,/Recusar e encerrar atendimento/);
 assert.match(js,/Registrar recebimento/);assert.match(js,/Iniciar manutenção/);
 const r=await fetch(url+'/ordens.html');assert.equal(r.status,200);
});
