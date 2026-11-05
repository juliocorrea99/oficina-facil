(() => {
'use strict';
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oid=Number(new URLSearchParams(location.search).get('oficinaId'));
let slots=[];
function alerta(m,erro=false){$('alerta-agendamento').innerHTML=`<div class="alert alert-${erro?'danger':'success'}" role="alert">${esc(m)}</div>`;}
async function carregarSlots(){
  $('horario').innerHTML='<option value="">Consultando horários...</option>';$('horario').disabled=true;slots=[];
  if(!$('servico').value||!$('data').value)return;
  try{
    const q=new URLSearchParams({oficinaId:String(oid),servicoId:$('servico').value,data:$('data').value});
    const r=await fetch(`/api/agendamentos/horarios?${q}`);const d=await r.json();
    if(!r.ok)throw new Error(d.mensagem||'Não foi possível consultar horários.');
    slots=d.horarios||[];
    $('horario').innerHTML='<option value="">Selecione o horário</option>'+slots.map((h,i)=>`<option value="${i}">${esc(h.horarioInicio)}–${esc(h.horarioFim)} (${h.vagasRestantes} vaga(s))</option>`).join('');
    $('horario').disabled=!slots.length;
    if(!slots.length)alerta('Não há horários disponíveis para este serviço e data.',true);
    else $('alerta-agendamento').innerHTML='';
  }catch(e){alerta(e.message,true);$('horario').innerHTML='<option value="">Sem disponibilidade</option>';}
}
$('servico').addEventListener('change',carregarSlots);$('data').addEventListener('change',carregarSlots);
$('form-agendar').addEventListener('submit',async e=>{
  e.preventDefault();const slot=slots[Number($('horario').value)];if(!slot){alerta('Selecione um horário.',true);return;}
  $('confirmar').disabled=true;
  try{
    const r=await fetch('/api/agendamentos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      oficinaId:oid,veiculoId:Number($('veiculo').value),servicoId:Number($('servico').value),disponibilidadeId:slot.disponibilidadeId,data:slot.data,horarioInicio:slot.horarioInicio,observacoes:$('observacoes').value
    })});const d=await r.json();
    if(!r.ok){alerta(d.mensagem||'Não foi possível reservar.',true);await carregarSlots();return;}
    alerta('Agendamento confirmado. Consulte sua agenda para acompanhar ou reagendar.');
    $('form-agendar').classList.add('d-none');
    const a=document.createElement('a');a.className='btn btn-success mb-4';a.href='/agendamentos.html';a.textContent='Ver meus agendamentos';$('alerta-agendamento').append(a);
  }catch(e){alerta('Erro de conexão. Verifique a agenda antes de tentar novamente.',true);}finally{$('confirmar').disabled=false;}
});
document.addEventListener('DOMContentLoaded',async()=>{
  const u=await obterUsuarioAtual();if(!u||u.perfil!=='cliente'){alerta('Entre com uma conta de Cliente para confirmar agendamentos.',true);$('form-agendar').classList.add('d-none');const link=document.createElement('a');link.href='/login.html';link.className='btn btn-primary mb-3';link.textContent='Entrar como Cliente';$('alerta-agendamento').append(link);return;}
  if(!Number.isSafeInteger(oid)||oid<1){alerta('Oficina inválida.',true);$('form-agendar').classList.add('d-none');return;}
  const hoje=new Date();$('data').min=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  try{
    const [ofi,vei]=await Promise.all([fetch(`/api/oficinas/${oid}`),fetch('/api/veiculos')]);
    if(!ofi.ok||!vei.ok)throw new Error('Não foi possível carregar dados para agendamento.');
    const oficina=(await ofi.json()).oficina;const veiculos=(await vei.json()).veiculos.filter(x=>x.ativo);
    $('nome-oficina').textContent=oficina.nomeFantasia;
    $('servico').innerHTML='<option value="">Selecione um serviço</option>'+oficina.servicos.map(s=>`<option value="${s.id}">${esc(s.nome)} (${s.duracaoEstimadaMinutos} min)</option>`).join('');
    $('veiculo').innerHTML='<option value="">Selecione um veículo</option>'+veiculos.map(v=>`<option value="${v.id}">${esc(v.placa)} — ${esc(v.marca)} ${esc(v.modelo)}</option>`).join('');
    const preselecionado=new URLSearchParams(location.search).get('servicoId');if(preselecionado&&oficina.servicos.some(s=>String(s.id)===preselecionado))$('servico').value=preselecionado;
    if(!veiculos.length)alerta('Cadastre um veículo antes de agendar.',true);
  }catch(e){alerta(e.message,true);}
});
})();
