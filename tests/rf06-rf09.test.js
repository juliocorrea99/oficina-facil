const test=require('node:test');
const assert=require('node:assert/strict');
const app=require('../src/server');
const db=require('../src/database/db');
const base=require('../src/database/mockDb');

let veiculos=[],agendamentos=[],eventos=[],proximoVeiculo=1,proximoAgenda=1;
const result=rows=>({rows,rowCount:rows.length});
const horaMin=h=>Number(h.slice(0,2))*60+Number(h.slice(3));
const intersecta=(a,ini,fim)=>horaMin(a.horario_inicio)<horaMin(fim)&&horaMin(a.horario_fim)>horaMin(ini);
function detalhe(a){
 const v=veiculos.find(v=>v.id===a.veiculo_id),s=base.servicos.find(s=>s.id===a.servico_id);
 const o=base.oficinas.find(o=>o.id===a.oficina_id),c=base.clientes.find(c=>c.id===a.cliente_id),u=base.usuarios.find(u=>u.id===c.usuario_id);
 return {id:a.id,clienteId:a.cliente_id,oficinaId:a.oficina_id,veiculoId:a.veiculo_id,servicoId:a.servico_id,disponibilidadeId:a.disponibilidade_id,
  data:a.data,horarioInicio:a.horario_inicio,horarioFim:a.horario_fim,observacoes:a.observacoes,status:a.status,motivoCancelamento:a.motivo_cancelamento,
  veiculoPlaca:v.placa,veiculoMarca:v.marca,veiculoModelo:v.modelo,servicoNome:s.nome,oficinaNome:o.nome_fantasia,
  clienteNome:u.nome,clienteTelefone:u.telefone};
}
const fake={
 async query(sql,params=[]){
  const q=sql.replace(/\s+/g,' ').trim();
  if(q==='BEGIN'||q==='COMMIT'||q==='ROLLBACK')return result([]);
  if(/^INSERT INTO veiculos/i.test(q)){
   const [uid,placa,marca,modelo,ano,apelido]=params,c=base.clientes.find(c=>c.usuario_id===uid);
   if(!c)return result([]);
   if(veiculos.some(v=>v.cliente_id===c.id&&v.placa===placa)){const e=Error('Duplicada');e.code='23505';throw e;}
   const v={id:proximoVeiculo++,cliente_id:c.id,clienteId:c.id,placa,marca,modelo,ano,apelido,ativo:true};veiculos.push(v);return result([{...v}]);
  }
  if(/^UPDATE veiculos v SET ativo=false/i.test(q)){
   const [id,uid]=params,c=base.clientes.find(x=>x.usuario_id===uid),v=veiculos.find(x=>x.id===id&&x.cliente_id===c?.id&&x.ativo);
   if(!v)return result([]);v.ativo=false;return result([{id:v.id,ativo:false}]);
  }
  if(/^UPDATE veiculos v SET placa/i.test(q)){
   const [id,uid,placa,marca,modelo,ano,apelido]=params,c=base.clientes.find(x=>x.usuario_id===uid),v=veiculos.find(x=>x.id===id&&x.cliente_id===c?.id&&x.ativo);
   if(!v)return result([]);Object.assign(v,{placa,marca,modelo,ano,apelido});return result([{...v}]);
  }
  if(/FROM veiculos v JOIN clientes c ON c.id = v.cliente_id WHERE c.usuario_id = \$1/i.test(q)){
   const c=base.clientes.find(x=>x.usuario_id===params[0]);return result(veiculos.filter(x=>x.cliente_id===c?.id).map(x=>({...x})));}
  if(/FROM veiculos WHERE id=\$1 AND cliente_id=\$2 AND ativo=true FOR UPDATE/i.test(q)){
   return result(veiculos.filter(v=>v.id===params[0]&&v.cliente_id===params[1]&&v.ativo).map(x=>({...x})));}
  if(/FROM disponibilidades WHERE id=\$1 AND oficina_id=\$2 AND ativo=true FOR UPDATE/i.test(q)){
   return result(base.disponibilidades.filter(d=>d.id===params[0]&&d.oficina_id===params[1]&&d.ativo)
     .map(d=>({id:d.id,oficina_id:d.oficina_id,ativo:d.ativo,data:d.data,horarioInicio:d.horario_inicio,horarioFim:d.horario_fim,vagas:d.vagas_simultaneas})));}
  if(/FROM disponibilidades WHERE oficina_id=\$1 AND data=\$2 AND ativo=true/i.test(q)){
   return result(base.disponibilidades.filter(d=>d.oficina_id===params[0]&&d.data===params[1]&&d.ativo)
     .map(d=>({id:d.id,horarioInicio:d.horario_inicio,horarioFim:d.horario_fim,vagas:d.vagas_simultaneas})));}
  if(/FROM servicos WHERE id=\$1 AND oficina_id=\$2 AND ativo=true/i.test(q)){
   return result(base.servicos.filter(s=>s.id===params[0]&&s.oficina_id===params[1]&&s.ativo).map(s=>({id:s.id,duracao:s.duracao_estimada_minutos})));}
  if(/FROM horarios_funcionamento WHERE oficina_id=\$1 AND dia_semana=\$2/i.test(q)){
   return result(base.horarios.filter(h=>h.oficina_id===params[0]&&h.dia_semana===params[1])
     .map(h=>({fechado:h.fechado,abertura:h.horario_abertura,fechamento:h.horario_fechamento})));}
  if(/SELECT COUNT\(\*\)::int AS total FROM agendamentos/i.test(q)){
   const [id,data,ini,fim,ignore]=params;
   const match=q.includes('veiculo_id=$1')?(a=>a.veiculo_id===id):(a=>a.oficina_id===id);
   const n=agendamentos.filter(a=>match(a)&&a.data===data&&a.status!=='cancelado'&&a.id!==ignore&&intersecta(a,ini,fim)).length;
   return result([{total:n}]);
  }
  if(/FROM agendamentos WHERE oficina_id=\$1 AND data=\$2 AND status IN/i.test(q)){
   const [oid,data]=params;return result(agendamentos.filter(a=>a.oficina_id===oid&&a.data===data&&a.status!=='cancelado')
     .map(a=>({inicio:a.horario_inicio,fim:a.horario_fim})));}
  if(/^INSERT INTO agendamentos/i.test(q)){
   const [cid,oid,vid,sid,did,data,ini,fim,obs]=params;
   const a={id:proximoAgenda++,cliente_id:cid,oficina_id:oid,veiculo_id:vid,servico_id:sid,
     disponibilidade_id:did,data,horario_inicio:ini,horario_fim:fim,observacoes:obs,status:'agendado',motivo_cancelamento:null};
   agendamentos.push(a);return result([{id:a.id}]);}
  if(/^INSERT INTO agendamento_eventos/i.test(q)){eventos.push({agendamentoId:params[0],usuarioId:params[1],acao:q.includes("'criado'")?'criado':q.includes("'reagendado'")?'reagendado':'cancelado'});return result([]);}
  if(/FROM agendamentos a JOIN veiculos v/i.test(q)){const a=agendamentos.find(x=>x.id===params[0]);return result(a?[detalhe(a)]:[]);}
  if(/SELECT a.id FROM agendamentos a JOIN clientes c/i.test(q)){
   const c=base.clientes.find(c=>c.usuario_id===params[0]);return result(agendamentos.filter(a=>a.cliente_id===c?.id).map(a=>({id:a.id})));}
  if(/SELECT id FROM agendamentos WHERE oficina_id=\$1/i.test(q)){
   return result(agendamentos.filter(a=>a.oficina_id===params[0]&&(!params[1]||a.data===params[1])).map(a=>({id:a.id})));}
  if(/FROM agendamentos WHERE id=\$1 AND cliente_id=\$2 FOR UPDATE/i.test(q)){
   return result(agendamentos.filter(a=>a.id===params[0]&&a.cliente_id===params[1]).map(a=>({...a})));}
  if(/^UPDATE agendamentos SET veiculo_id/i.test(q)){
   const [id,vid,sid,did,data,ini,fim,obs]=params,a=agendamentos.find(a=>a.id===id);Object.assign(a,{veiculo_id:vid,servico_id:sid,disponibilidade_id:did,data,horario_inicio:ini,horario_fim:fim,observacoes:obs});return result([]);}
  if(/^UPDATE agendamentos SET status='cancelado'/i.test(q)){
   const a=agendamentos.find(a=>a.id===params[0]);a.status='cancelado';a.motivo_cancelamento=params[1];return result([]);}
  return base.query(sql,params);
 },
 getClient(){return Promise.resolve({query:(s,p)=>this.query(s,p),release(){}});}
};
let server,url;
const json=async (route,{method='GET',token,body}={})=>{
 const r=await fetch(url+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,...await r.json()};
};
let tokenC,tokenC2,tokenOficina,tokenOficina2,idOficina,idOficina2,servicoId,servicoId2,dispId,dispId2,veiculoId;
const DATA='2099-11-09';

test.before(async()=>{db.setCustomExecutor(fake);server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));db.setCustomExecutor(null);});
test.beforeEach(()=>{base.reset();veiculos=[];agendamentos=[];eventos=[];proximoVeiculo=1;proximoAgenda=1;});
async function preparar(){
 const c=await json('/api/auth/cadastro/cliente',{method:'POST',body:{nome:'Cliente Primeiro',email:'primeiro@teste.com',senha:'senha123'}});
 const c2=await json('/api/auth/cadastro/cliente',{method:'POST',body:{nome:'Cliente Segundo',email:'segundo@teste.com',senha:'senha123'}});
 const o=await json('/api/auth/cadastro/oficina',{method:'POST',body:{nome:'Oficina Um',email:'primeira@oficina.com',senha:'senha123',nomeFantasia:'Oficina Um',cnpj:'00.000.000/0001-91',cidade:'Brasília',uf:'DF'}});
 const o2=await json('/api/auth/cadastro/oficina',{method:'POST',body:{nome:'Oficina Dois',email:'segunda@oficina.com',senha:'senha123',nomeFantasia:'Oficina Dois',cnpj:'11.222.333/0001-81',cidade:'Brasília',uf:'DF'}});
 assert.equal(c.status,201);assert.equal(c2.status,201);assert.equal(o.status,201);assert.equal(o2.status,201);
 tokenC=c.token;tokenC2=c2.token;tokenOficina=o.token;tokenOficina2=o2.token;
 idOficina=base.oficinas[0].id;idOficina2=base.oficinas[1].id;
 const sv=await json('/api/oficinas/me/servicos',{method:'POST',token:tokenOficina,body:{nome:'Troca de óleo',duracaoEstimadaMinutos:60,precoEstimado:120}});
 const sv2=await json('/api/oficinas/me/servicos',{method:'POST',token:tokenOficina2,body:{nome:'Revisão',duracaoEstimadaMinutos:60}});
 assert.equal(sv.status,201);assert.equal(sv2.status,201);servicoId=sv.servico.id;servicoId2=sv2.servico.id;
 const dia=new Date(`${DATA}T12:00:00Z`).getUTCDay();
 for(const [token] of [[tokenOficina],[tokenOficina2]]){
  const h=await json('/api/oficinas/me/horarios',{method:'PUT',token,body:{horarios:[{diaSemana:dia,horarioAbertura:'08:00',horarioFechamento:'18:00',fechado:false}]}});assert.equal(h.status,200);}
 const d=await json('/api/oficinas/me/disponibilidades',{method:'POST',token:tokenOficina,body:{data:DATA,horarioInicio:'08:00',horarioFim:'12:00',vagasSimultaneas:1}});
 const d2=await json('/api/oficinas/me/disponibilidades',{method:'POST',token:tokenOficina2,body:{data:DATA,horarioInicio:'08:00',horarioFim:'12:00',vagasSimultaneas:1}});
 assert.equal(d.status,201);assert.equal(d2.status,201);dispId=d.disponibilidade.id;dispId2=d2.disponibilidade.id;
 const v=await json('/api/veiculos',{method:'POST',token:tokenC,body:{placa:'ABC1D23',marca:'Fiat',modelo:'Argo',ano:2022}});
 assert.equal(v.status,201);veiculoId=v.veiculo.id;
}
const reservar=(extra={},token)=>json('/api/agendamentos',{method:'POST',token:token||tokenC,body:{oficinaId:idOficina,veiculoId,servicoId,disponibilidadeId:dispId,data:DATA,horarioInicio:'08:00',...extra}});

test('RF06: exige cliente autenticado e CRUD com inativação lógica',async()=>{
 await preparar();
 assert.equal((await json('/api/veiculos')).status,401);
 assert.equal((await json('/api/veiculos',{token:tokenOficina})).status,403);
 const l=await json('/api/veiculos',{token:tokenC});assert.equal(l.veiculos.length,1);
 const ed=await json(`/api/veiculos/${veiculoId}`,{method:'PUT',token:tokenC,body:{placa:'ABC1D23',marca:'Fiat',modelo:'Uno',ano:2015}});
 assert.equal(ed.status,200);assert.equal(ed.veiculo.modelo,'Uno');
 assert.equal((await json(`/api/veiculos/${veiculoId}`,{method:'PUT',token:tokenC2,body:{placa:'ABC1D23',marca:'Fiat',modelo:'Punto'}})).status,404);
 const inativ=await json(`/api/veiculos/${veiculoId}/inativar`,{method:'PATCH',token:tokenC});assert.equal(inativ.status,200);
 assert.equal((await reservar()).status,403);
});
test('RF06: placa duplicada e formato inválido são rejeitados',async()=>{
 await preparar();
 assert.equal((await json('/api/veiculos',{method:'POST',token:tokenC,body:{placa:'ABC1D23',marca:'Fiat',modelo:'Argo'}})).status,409);
 assert.equal((await json('/api/veiculos',{method:'POST',token:tokenC,body:{placa:'INVALIDA',marca:'Fiat',modelo:'Argo'}})).status,400);
});
test('RF07: slots públicos são exibidos e reserva usa dados reais',async()=>{
 await preparar();
 const s=await json(`/api/agendamentos/horarios?oficinaId=${idOficina}&servicoId=${servicoId}&data=${DATA}`);
 assert.equal(s.status,200);assert.ok(s.horarios.some(x=>x.horarioInicio==='08:00'));
 assert.equal((await reservar({},tokenOficina)).status,403);
 const r=await reservar();assert.equal(r.status,201);assert.equal(r.agendamento.status,'agendado');assert.equal(r.agendamento.veiculoPlaca,'ABC1D23');
 assert.equal(eventos[0].acao,'criado');
});
test('RN02, RN03, RN04: bloqueia veículo alheio, conflito e lotação',async()=>{
 await preparar();
 assert.equal((await reservar({},tokenC2)).status,403);
 const um=await reservar();assert.equal(um.status,201);
 assert.equal((await reservar()).status,409);
 const outro=await json('/api/veiculos',{method:'POST',token:tokenC2,body:{placa:'DEF4G56',marca:'VW',modelo:'Gol'}});
 assert.equal(outro.status,201);
 assert.equal((await reservar({veiculoId:outro.veiculo.id},tokenC2)).status,409);
 assert.equal((await reservar({veiculoId:outro.veiculo.id,horarioInicio:'07:00'},tokenC2)).status,409);
 assert.equal((await reservar({veiculoId:outro.veiculo.id,horarioInicio:'11:30'},tokenC2)).status,409);
});
test('RF08: permite reagendar e cancelar antes do recebimento',async()=>{
 await preparar();const r=await reservar();assert.equal(r.status,201);
 const id=r.agendamento.id;
 const novo=await json(`/api/agendamentos/${id}`,{method:'PUT',token:tokenC,body:{disponibilidadeId:dispId,data:DATA,horarioInicio:'09:00'}});
 assert.equal(novo.status,200);assert.equal(novo.agendamento.horarioInicio,'09:00');
 assert.equal((await json(`/api/agendamentos/${id}/cancelar`,{method:'PATCH',token:tokenC2,body:{}})).status,404);
 const can=await json(`/api/agendamentos/${id}/cancelar`,{method:'PATCH',token:tokenC,body:{motivo:'Não poderei comparecer'}});
 assert.equal(can.status,200);assert.equal(can.agendamento.status,'cancelado');
 assert.equal((await json(`/api/agendamentos/${id}`,{method:'PUT',token:tokenC,body:{disponibilidadeId:dispId,data:DATA,horarioInicio:'10:00'}})).status,409);
 const reservarDeNovo=await reservar();assert.equal(reservarDeNovo.status,201);
 assert.deepEqual(eventos.map(e=>e.acao),['criado','reagendado','cancelado','criado']);
});
test('RN05: atendimento recebido não admite alteração nem cancelamento',async()=>{
 await preparar();const r=await reservar();const a=agendamentos.find(a=>a.id===r.agendamento.id);a.status='recebido';
 assert.equal((await json(`/api/agendamentos/${a.id}/cancelar`,{method:'PATCH',token:tokenC,body:{}})).status,409);
 assert.equal((await json(`/api/agendamentos/${a.id}`,{method:'PUT',token:tokenC,body:{disponibilidadeId:dispId,data:DATA,horarioInicio:'09:00'}})).status,409);
});
test('RF09: apenas oficina proprietária vê seus agendamentos e veículo',async()=>{
 await preparar();const a=await reservar();assert.equal(a.status,201);
 const agenda=await json(`/api/agendamentos/oficina?data=${DATA}`,{token:tokenOficina});
 assert.equal(agenda.status,200);assert.equal(agenda.agendamentos.length,1);
 assert.equal(agenda.agendamentos[0].clienteNome,'Cliente Primeiro');
 const outra=await json('/api/agendamentos/oficina',{token:tokenOficina2});assert.equal(outra.status,200);assert.equal(outra.agendamentos.length,0);
 assert.equal((await json('/api/agendamentos/oficina',{token:tokenC})).status,403);
 assert.equal((await json('/api/agendamentos/me',{token:tokenC})).agendamentos.length,1);
 assert.equal((await json('/api/agendamentos/me',{token:tokenC2})).agendamentos.length,0);
});
