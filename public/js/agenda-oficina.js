(() => {
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function carregar(){
 const corpo=document.getElementById('corpo-agenda-oficina');if(!corpo)return;
 const data=document.getElementById('filtro-agenda-data').value;
 corpo.innerHTML='<tr><td colspan="6" class="text-center">Carregando agenda...</td></tr>';
 try{
  const url='/api/agendamentos/oficina'+(data?'?'+new URLSearchParams({data}):'');
  const r=await fetch(url);const resposta=await r.json();if(!r.ok)throw new Error(resposta.mensagem||'Falha ao consultar agenda.');
  const lista=resposta.agendamentos||[];
  corpo.innerHTML=lista.length?lista.map(a=>`<tr><td>${esc(a.data)}<br><small>${esc(a.horarioInicio)}–${esc(a.horarioFim)}</small></td><td>${esc(a.clienteNome)}<br><small>${esc(a.clienteTelefone||'Telefone não informado')}</small></td><td>${esc(a.veiculoPlaca)}<br><small>${esc(a.veiculoMarca)} ${esc(a.veiculoModelo)}</small></td><td>${esc(a.servicoNome)}</td><td>${esc(a.status)}</td><td>${esc(a.observacoes||'—')}</td></tr>`).join(''):'<tr><td colspan="6" class="text-muted text-center">Nenhum atendimento encontrado para o filtro informado.</td></tr>';
 }catch(e){corpo.innerHTML=`<tr><td colspan="6" class="text-danger">${esc(e.message)}</td></tr>`;}
}
window.inicializarAgendaOficina=function(){
 document.getElementById('btn-filtrar-agenda').addEventListener('click',carregar);
 document.getElementById('btn-limpar-agenda').addEventListener('click',()=>{document.getElementById('filtro-agenda-data').value='';carregar();});
 carregar();
};
})();
