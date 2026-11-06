'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../src/server');
const db = require('../src/database/db');
const {gerarToken} = require('../src/services/authService');

const token = (id, perfil) => gerarToken({id,perfil,nome:'Teste',email:`${id}@exemplo.test`});
const cliente = token(10,'cliente');
const clienteAlheio = token(20,'cliente');
const oficina = token(30,'oficina');
class MockAvaliacoes {
  reset() {
    this.ordens = [
      {id:1,status:'entregue',usuarioId:10,oficinaId:9},
      {id:2,status:'finalizado',usuarioId:10,oficinaId:9},
      {id:3,status:'em_manutencao',usuarioId:10,oficinaId:9},
      {id:4,status:'cancelado',usuarioId:10,oficinaId:9},
      {id:5,status:'entregue',usuarioId:20,oficinaId:12},
    ];
    this.registros=[];
  }
  async query(sql, params=[]) {
    const q=sql.trim().replace(/\s+/g,' ');
    const linhas=rows=>({rows,rowCount:rows.length});
    if (q.startsWith('SELECT os.id, os.status FROM ordens_servico os')) {
      return linhas(this.ordens.filter(o=>o.id===params[0] && o.usuarioId===params[1]).map(o=>({id:o.id,status:o.status})));
    }
    if (q.startsWith('INSERT INTO avaliacoes (ordem_id, nota, comentario)')) {
      const [id,nota,comentario,usuarioId] = params;
      const ordem=this.ordens.find(o=>o.id===id && o.usuarioId===usuarioId && ['finalizado','entregue'].includes(o.status));
      if (!ordem || this.registros.some(r=>r.ordemId===id)) return linhas([]);
      const novo={id:this.registros.length+1,ordemId:id,nota,comentario,criadoEm:'2026-11-05T12:00:00Z',oficinaId:ordem.oficinaId,usuarioId};
      this.registros.push(novo);return linhas([novo]);
    }
    if (q.startsWith('SELECT av.id, av.ordem_id AS "ordemId"')) return linhas(this.registros.filter(r=>r.usuarioId===params[0]).map(r=>({...r})));
    if (q.startsWith('SELECT id FROM oficinas WHERE id=$1')) return linhas([9,12].includes(params[0])?[{id:params[0]}]:[]);
    if (q.startsWith('SELECT COUNT(*)::int AS quantidade')) {
      const rs=this.registros.filter(r=>r.oficinaId===params[0]);
      return linhas([{quantidade:rs.length,media:rs.length?Math.round(rs.reduce((sum,r)=>sum+r.nota,0)/rs.length*10)/10:0}]);
    }
    if (q.startsWith('SELECT av.id, av.nota, av.comentario')) return linhas(this.registros.filter(r=>r.oficinaId===params[0]).map(r=>({id:r.id,nota:r.nota,comentario:r.comentario,criadoEm:r.criadoEm})));
    throw new Error('Consulta não prevista no teste RF14: '+q);
  }
  async getClient() {return {query:(sql,params)=>this.query(sql,params),release(){}};}
}
const fake = new MockAvaliacoes();
let server,base;
async function req(rota,{method='GET',auth,body}={}) {
  const res = await fetch(base+rota,{method,headers:{...(auth?{Authorization:`Bearer ${auth}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,...await res.json()};
}
const aval=(id=1,nota=5,comentario='Serviço bem realizado.')=>({ordemId:id,nota,comentario});
test.before(async()=>{db.setCustomExecutor(fake);server=app.listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(r=>server.close(r));db.setCustomExecutor(null);});
test.beforeEach(()=>fake.reset());

test('RF14: apenas cliente autenticado pode cadastrar avaliação',async()=>{
  assert.equal((await req('/api/avaliacoes',{method:'POST',body:aval()})).status,401);
  assert.equal((await req('/api/avaliacoes',{method:'POST',auth:oficina,body:aval()})).status,403);
  assert.equal((await req('/api/avaliacoes',{method:'POST',auth:clienteAlheio,body:aval()})).status,404);
});
test('RF14: ordem inexistente, não concluída ou cancelada não pode ser avaliada',async()=>{
  for(const id of [3,4]) {
    const r=await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(id)});
    assert.equal(r.status,409);assert.match(r.mensagem,/conclusão/);
  }
  assert.equal((await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(99)})).status,404);
});
test('RF14: notas e comentários são validados no servidor com mensagens claras',async()=>{
  for(const nota of [0,6,2.5,null,[5],{},'5.0']) {
    const r=await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1,nota)});
    assert.equal(r.status,400,`nota ${JSON.stringify(nota)}`);
    assert.match(r.mensagem,/nota de 1 a 5/);
  }
  for(const comentario of ['', '   ', 'x'.repeat(1001), null, {}]) {
    const r=await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1,5,comentario)});
    assert.equal(r.status,400);
    assert.match(r.mensagem,/[Cc]omentário/);
  }
});
test('RF14: cliente avalia ordem entregue; duplicidade não é aceita',async()=>{
  const primeira=await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1,5,'Bom atendimento.')});
  assert.equal(primeira.status,201);assert.equal(primeira.avaliacao.nota,5);
  assert.match(primeira.mensagem,/sucesso/);
  assert.equal((await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1,1)})).status,409);
  assert.equal(fake.registros.length,1);
});
test('RF14: também aceita ordem finalizada sem entrega registrada',async()=>{
  const r=await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(2,4,'Serviço finalizado.')});
  assert.equal(r.status,201);
});
test('RF14: lista minhas avaliações somente do cliente titular',async()=>{
  await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1)});
  const minhas=await req('/api/avaliacoes/minhas',{auth:cliente});
  assert.equal(minhas.status,200);assert.equal(minhas.avaliacoes.length,1);
  assert.equal(minhas.avaliacoes[0].ordemId,1);
  const outra=await req('/api/avaliacoes/minhas',{auth:clienteAlheio});
  assert.deepEqual(outra.avaliacoes,[]);
  assert.equal((await req('/api/avaliacoes/minhas',{auth:oficina})).status,403);
});
test('RF14: perfil público exibe média e apenas os comentários da oficina consultada, sem dados pessoais',async()=>{
  await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(1,5,'Excelente.')});
  await req('/api/avaliacoes',{method:'POST',auth:cliente,body:aval(2,3,'Foi razoável.')});
  await req('/api/avaliacoes',{method:'POST',auth:clienteAlheio,body:aval(5,1,'Outra oficina.')});
  const pub=await req('/api/oficinas/9/avaliacoes');
  assert.equal(pub.status,200);assert.equal(pub.quantidade,2);assert.equal(pub.media,4);
  assert.equal(pub.avaliacoes.length,2);
  assert.ok(pub.avaliacoes.every(x=>!('usuarioId' in x)&&!('clienteId' in x)&&!('email' in x)));
  const outra=await req('/api/oficinas/12/avaliacoes');
  assert.equal(outra.quantidade,1);assert.equal(outra.avaliacoes[0].comentario,'Outra oficina.');
});
test('RF14/RF15: oficina sem avaliações apresenta resumo vazio e erros contextualizados',async()=>{
  const vazio=await req('/api/oficinas/9/avaliacoes');
  assert.equal(vazio.status,200);assert.equal(vazio.quantidade,0);assert.equal(vazio.media,0);
  assert.equal((await req('/api/oficinas/999/avaliacoes')).status,404);
  assert.equal((await req('/api/oficinas/abc/avaliacoes')).status,400);
});
test('RF15: mensagens usam textContent e canal acessível sem interpretar HTML',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../public/js/feedback.js'),'utf8');
  const area={children:[],attrs:{},setAttribute(n,v){this.attrs[n]=v;},replaceChildren(...els){this.children=els;}};
  const doc={getElementById(id){return id==='avisos'?area:null;},createElement(tag){return {tag,attrs:{},setAttribute(n,v){this.attrs[n]=v;}};}};
  const ctx={window:{},document:doc};vm.runInNewContext(code,ctx);
  assert.equal(ctx.window.OficinaFeedback.mostrar('avisos','<img src=x onerror=alert(1)>','erro'),true);
  assert.equal(area.children[0].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(area.children[0].attrs.role,'alert');
  assert.equal(area.attrs['aria-live'],'assertive');
  assert.equal(ctx.window.OficinaFeedback.mostrar('avisos','Avaliação enviada com sucesso.','sucesso'),true);
  assert.equal(area.children[0].attrs.role,'status');
  ctx.window.OficinaFeedback.limpar('avisos');assert.equal(area.children.length,0);
});
test('RF14/RF15: interfaces incluem avaliações, estrelas e mensagens com rótulos',()=>{
  const ordens=fs.readFileSync(path.join(__dirname,'../public/js/ordens.js'),'utf8');
  const perfil=fs.readFileSync(path.join(__dirname,'../public/oficina.html'),'utf8');
  assert.match(ordens,/Avaliar atendimento concluído/);
  assert.match(ordens,/\/api\/avaliacoes\/minhas/);
  assert.match(ordens,/Enviar avaliação/);
  assert.match(perfil,/avaliacoes-publicas\.js/);
  assert.match(ordens,/OficinaFeedback\.mostrar/);
});
