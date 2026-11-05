(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lista=[], editando=null;
  function alerta(msg,erro=false){ $('alerta-veiculos').innerHTML=`<div class="alert alert-${erro?'danger':'success'}" role="alert">${esc(msg)}</div>`; }
  async function carregar(){
    try {
      const r=await fetch('/api/veiculos'); if(!r.ok)throw new Error('Erro ao consultar veículos.');
      lista=(await r.json()).veiculos;
      $('lista').innerHTML=lista.length?`<table class="table align-middle"><thead><tr><th>Placa</th><th>Veículo</th><th>Ano</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${lista.map(v=>`<tr><td>${esc(v.placa)}</td><td>${esc(v.marca)} ${esc(v.modelo)}${v.apelido?`<small class="d-block text-muted">${esc(v.apelido)}</small>`:''}</td><td>${esc(v.ano||'—')}</td><td>${v.ativo?'Ativo':'Inativo'}</td><td>${v.ativo?`<button class="btn btn-sm btn-outline-primary me-2" data-acao="editar" data-id="${v.id}">Editar</button><button class="btn btn-sm btn-outline-danger" data-acao="inativar" data-id="${v.id}">Inativar</button>`:'—'}</td></tr>`).join('')}</tbody></table>`:'<p class="text-muted mb-0">Nenhum veículo cadastrado.</p>';
    } catch(e){ alerta(e.message,true); }
  }
  $('lista').addEventListener('click',async e=>{
    const b=e.target.closest('button[data-acao]');if(!b)return;
    const v=lista.find(x=>x.id===Number(b.dataset.id));if(!v)return;
    if(b.dataset.acao==='editar'){
      editando=v.id;
      ['placa','marca','modelo','ano','apelido'].forEach(id=>$(id).value=v[id]??'');
      $('titulo-form').textContent='Editar veículo';$('salvar').textContent='Salvar alterações';$('cancelar').classList.remove('d-none');$('placa').focus();
      window.scrollTo({top:0,behavior:'smooth'});
    } else if(confirm(`Deseja inativar o veículo ${v.placa}? O histórico de agendamentos será preservado.`)){
      const r=await fetch(`/api/veiculos/${v.id}/inativar`,{method:'PATCH'});
      const d=await r.json();alerta(d.sucesso?'Veículo inativado.':d.mensagem,!d.sucesso);if(r.ok)carregar();
    }
  });
  function limpar(){editando=null;$('form-veiculo').reset();$('titulo-form').textContent='Cadastrar veículo';$('salvar').textContent='Cadastrar veículo';$('cancelar').classList.add('d-none');}
  $('cancelar').addEventListener('click',limpar);
  $('form-veiculo').addEventListener('submit',async e=>{
    e.preventDefault();
    const dados=Object.fromEntries(['placa','marca','modelo','ano','apelido'].map(x=>[x,$(x).value.trim()]));
    try{
      const r=await fetch(editando?`/api/veiculos/${editando}`:'/api/veiculos',{method:editando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});
      const d=await r.json();alerta(d.sucesso?'Veículo salvo com sucesso.':d.mensagem,!d.sucesso);
      if(r.ok){limpar();await carregar();}
    }catch(e){alerta('Não foi possível conectar ao servidor.',true);}
  });
  document.addEventListener('DOMContentLoaded',async()=>{const u=await obterUsuarioAtual();if(!u||u.perfil!=='cliente'){window.location.href='/login.html';return;}carregar();});
})();
