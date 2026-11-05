(() => {
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let agendamentos=[];
function alerta(m,erro=false){$('alerta').innerHTML=`<div role="alert" class="alert alert-${erro?'danger':'success'}">${esc(m)}</div>`;}
async function carregar(){
 try{
  const r=await fetch('/api/agendamentos/me');if(!r.ok)throw new Error('Não foi possível carregar agendamentos.');
  agendamentos=(await r.json()).agendamentos;
  $('lista').innerHTML=agendamentos.length?agendamentos.map(a=>`<div class="col-lg-6"><article class="card auth-card p-4 h-100">
    <h2 class="h5">${esc(a.oficinaNome)} <span class="badge ${a.status==='cancelado'?'bg-secondary':a.status==='recebido'?'bg-info':'bg-success'}">${esc(a.status)}</span></h2>
    <p class="mb-1"><strong>${esc(a.servicoNome)}</strong> — ${esc(a.veiculoPlaca)} (${esc(a.veiculoMarca)} ${esc(a.veiculoModelo)})</p>
    <p class="mb-3">${esc(a.data)} · ${esc(a.horarioInicio)}–${esc(a.horarioFim)}</p>
    ${a.status==='recebido'?`<a class="btn btn-outline-primary btn-sm mb-2" href="/ordens.html">Acompanhar ordem de serviço</a>`:''}
    ${a.status==='agendado'?`<div class="d-flex gap-2"><button class="btn btn-outline-primary btn-sm" data-acao="reagendar" data-id="${a.id}">Reagendar</button><button class="btn btn-outline-danger btn-sm" data-acao="cancelar" data-id="${a.id}">Cancelar</button></div>
    <div id="remarcar-${a.id}" class="d-none mt-3 p-3 border rounded bg-light"><label class="form-label" for="data-${a.id}">Nova data</label><input type="date" class="form-control mb-2" id="data-${a.id}" value="${esc(a.data)}"><label class="form-label" for="hora-${a.id}">Novo horário</label><select class="form-select mb-3" id="hora-${a.id}"><option value="">Escolha uma nova data</option></select><button type="button" class="btn btn-primary btn-sm" data-acao="salvar" data-id="${a.id}">Confirmar novo horário</button></div>`:''}
  </article></div>`).join(''):'<div class="col-12"><div class="alert alert-light border">Nenhum agendamento cadastrado. <a href="/oficinas.html">Buscar oficinas</a></div></div>';
 }catch(e){alerta(e.message,true);}
}
async function consultar(a){
 const input=$(`data-${a.id}`),select=$(`hora-${a.id}`);select.innerHTML='<option value="">Consultando...</option>';
 try{
  const q=new URLSearchParams({oficinaId:a.oficinaId,servicoId:a.servicoId,data:input.value});
  const r=await fetch(`/api/agendamentos/horarios?${q}`);const d=await r.json();if(!r.ok)throw new Error(d.mensagem);
  select.innerHTML='<option value="">Selecione</option>'+(d.horarios||[]).map(h=>`<option value="${h.disponibilidadeId}|${h.horarioInicio}">${esc(h.horarioInicio)}–${esc(h.horarioFim)} (${h.vagasRestantes} vagas)</option>`).join('');
 }catch(e){select.innerHTML='<option value="">Sem disponibilidade</option>';alerta(e.message,true);}
}
$('lista').addEventListener('change',e=>{const m=e.target.id.match(/^data-(\d+)$/);if(m){const a=agendamentos.find(x=>x.id===Number(m[1]));if(a)consultar(a);}});
$('lista').addEventListener('click',async e=>{
 const b=e.target.closest('button[data-acao]');if(!b)return;
 const a=agendamentos.find(x=>x.id===Number(b.dataset.id));if(!a)return;
 if(b.dataset.acao==='reagendar'){
  $(`remarcar-${a.id}`).classList.toggle('d-none');const hoje=new Date();$(`data-${a.id}`).min=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;consultar(a);
 } else if(b.dataset.acao==='cancelar'){
  if(!confirm(`Cancelar o atendimento de ${a.data}, às ${a.horarioInicio}?`))return;
  const r=await fetch(`/api/agendamentos/${a.id}/cancelar`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});const d=await r.json();alerta(d.sucesso?'Agendamento cancelado.':d.mensagem,!d.sucesso);if(r.ok)carregar();
 }else if(b.dataset.acao==='salvar'){
  const valor=$(`hora-${a.id}`).value;if(!valor){alerta('Selecione um horário disponível.',true);return;}
  const [disponibilidadeId,horarioInicio]=valor.split('|');
  const r=await fetch(`/api/agendamentos/${a.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({disponibilidadeId:Number(disponibilidadeId),data:$(`data-${a.id}`).value,horarioInicio})});
  const d=await r.json();alerta(d.sucesso?'Agendamento reagendado.':d.mensagem,!d.sucesso);if(r.ok)carregar();
 }
});
document.addEventListener('DOMContentLoaded',async()=>{const u=await obterUsuarioAtual();if(!u||u.perfil!=='cliente'){location.href='/login.html';return;}carregar();});
})();
