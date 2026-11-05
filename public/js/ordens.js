(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dinheiro = v => Number(v || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const nomes = {recebido:'Recebido',diagnostico:'Diagnóstico',orcamento:'Orçamento em elaboração',
  aguardando_aprovacao:'Aguardando aprovação',em_manutencao:'Em manutenção',
  finalizado:'Finalizado',entregue:'Entregue',cancelado:'Cancelado'};
const tipos = {peca:'Peça',servico:'Serviço',mao_de_obra:'Mão de obra'};
let perfil = null;
let ordens = [];
let pendentes = [];
let carregando = false;
function aviso(mensagem, erro = false) {
  $('aviso-os').innerHTML = `<div class="alert alert-${erro?'danger':'success'}" role="alert">${esc(mensagem)}</div>`;
  $('aviso-os').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function api(url, method = 'GET', body) {
  const res = await fetch(url,{method,headers:{Accept:'application/json', ...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  let dados;
  try { dados = await res.json(); } catch (_) { throw new Error('Não foi possível ler a resposta do servidor.'); }
  if (!res.ok || dados.sucesso === false) throw new Error(dados.mensagem || 'Operação não concluída.');
  return dados;
}
function etiqueta(status) {return `<span class="badge ${status==='cancelado'?'bg-secondary':status==='entregue'||status==='finalizado'?'bg-success':status==='aguardando_aprovacao'?'bg-warning text-dark':'bg-primary'}">${esc(nomes[status] || status)}</span>`;}
function conteudoOrcamento(o) {
  if (!o.itens?.length) return '<p class="text-muted small">Orçamento ainda não cadastrado.</p>';
  return `<div class="table-responsive"><table class="table table-sm align-middle">
   <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Subtotal</th></tr></thead><tbody>
   ${o.itens.map(i=>`<tr><td>${esc(tipos[i.tipo]||i.tipo)}</td><td>${esc(i.descricao)}</td><td>${esc(i.quantidade)}</td><td>${dinheiro(i.valorUnitario)}</td><td>${dinheiro(i.subtotal)}</td></tr>`).join('')}
   </tbody></table></div><div class="text-end"><small>Mão de obra: ${dinheiro(o.maoDeObra)}</small><p class="fw-bold mb-1">Total: ${dinheiro(o.total)}</p></div>`;
}
function linhaItem(i) {
  return `<div class="row g-2 align-items-end item-orcamento border rounded p-2 mb-2">
   <div class="col-md-2"><label class="form-label small">Tipo</label><select class="form-select form-select-sm campo-tipo"><option value="peca" ${i?.tipo==='peca'?'selected':''}>Peça</option><option value="servico" ${i?.tipo==='servico'?'selected':''}>Serviço</option><option value="mao_de_obra" ${i?.tipo==='mao_de_obra'?'selected':''}>Mão de obra</option></select></div>
   <div class="col-md-4"><label class="form-label small">Descrição</label><input class="form-control form-control-sm campo-descricao" maxlength="200" required value="${esc(i?.descricao||'')}"></div>
   <div class="col-md-2"><label class="form-label small">Quantidade</label><input type="number" class="form-control form-control-sm campo-quantidade" min="0.01" max="999" step="0.01" required value="${esc(i?.quantidade ?? 1)}"></div>
   <div class="col-md-2"><label class="form-label small">Preço unitário (R$)</label><input type="number" class="form-control form-control-sm campo-preco" min="0" max="999999" step="0.01" required value="${esc(i?.valorUnitario ?? 0)}"></div>
   <div class="col-md-2"><button type="button" class="btn btn-outline-danger btn-sm" data-acao="tirar-item">Remover item</button></div></div>`;
}
function editorOrcamento(o) {
  if (!['diagnostico','orcamento','aguardando_aprovacao','em_manutencao'].includes(o.status)) return '';
  const alerta = ['aguardando_aprovacao','em_manutencao'].includes(o.status)
    ? '<div class="alert alert-warning small">Alterar este orçamento revoga a aprovação anterior e exige nova aprovação. A manutenção não poderá avançar até lá.</div>' : '';
  return `<details class="border rounded p-3 mt-3"><summary class="fw-semibold">${o.itens?.length?'Revisar orçamento':'Cadastrar orçamento'}</summary>
   <div class="mt-3">${alerta}<p class="small text-muted">Registre peças, serviços e mão de obra. O total é calculado pelos itens.</p>
   <div class="itens-editor" data-ordem="${o.id}">${(o.itens?.length ? o.itens : [null]).map(linhaItem).join('')}</div>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-secondary btn-sm" data-acao="novo-item" data-id="${o.id}">+ Adicionar item</button>
   <button class="btn btn-primary btn-sm" data-acao="salvar-orcamento" data-id="${o.id}">Salvar orçamento</button></div></div>
  </details>`;
}
function controlesOficina(o) {
  const id = o.id;
  let html = '';
  if (['recebido','diagnostico'].includes(o.status)) html += `<div class="mt-3"><label class="form-label fw-semibold" for="diagnostico-${id}">Diagnóstico</label>
    <textarea id="diagnostico-${id}" class="form-control mb-2" rows="3" maxlength="5000" placeholder="Descreva o diagnóstico do veículo">${esc(o.diagnostico||'')}</textarea>
    <button class="btn btn-primary btn-sm" data-acao="diagnosticar" data-id="${id}">Salvar diagnóstico</button></div>`;
  html += editorOrcamento(o);
  if (o.status === 'orcamento' && o.itens?.length) html += `<button class="btn btn-primary btn-sm mt-3" data-acao="enviar" data-id="${id}">Enviar orçamento para aprovação</button>`;
  if (o.status === 'aguardando_aprovacao') html += o.decisaoOrcamento === 'aprovado'
    ? `<div class="alert alert-success mt-3">Orçamento versão ${esc(o.versaoAprovada)} aprovado pelo cliente.</div><button class="btn btn-success btn-sm" data-acao="avancar" data-status="em_manutencao" data-id="${id}">Iniciar manutenção</button>`
    : '<p class="alert alert-warning mt-3">Aguardando aprovação do cliente. Não é permitido iniciar a manutenção.</p>';
  if (o.status === 'em_manutencao') html += `<button class="btn btn-success btn-sm mt-3" data-acao="avancar" data-status="finalizado" data-id="${id}">Marcar como finalizado</button>`;
  if (o.status === 'finalizado') html += `<button class="btn btn-success btn-sm mt-3" data-acao="avancar" data-status="entregue" data-id="${id}">Registrar entrega do veículo</button>`;
  if (!['cancelado','finalizado','entregue'].includes(o.status)) html += ` <button class="btn btn-outline-danger btn-sm mt-3 ms-1" data-acao="cancelar-oficina" data-id="${id}">Cancelar ordem (com motivo)</button>`;
  return html;
}
function controlesCliente(o) {
  if (o.status === 'aguardando_aprovacao' && o.decisaoOrcamento !== 'aprovado') return `
   <div class="alert alert-warning mt-3">Revise o orçamento completo antes de decidir. Nenhuma manutenção pode começar sem sua aprovação.</div>
   <div class="mb-2"><label class="form-label" for="motivo-${o.id}">Motivo da recusa (opcional)</label><textarea id="motivo-${o.id}" class="form-control" rows="2" maxlength="500" placeholder="Informe o motivo, se desejar"></textarea></div>
   <div class="d-flex gap-2 flex-wrap"><button class="btn btn-success btn-sm" data-acao="decidir" data-decisao="aprovado" data-id="${o.id}">Aprovar orçamento</button>
   <button class="btn btn-outline-danger btn-sm" data-acao="decidir" data-decisao="recusado" data-id="${o.id}">Recusar orçamento</button>
   <button class="btn btn-danger btn-sm" data-acao="recusar-encerrar" data-id="${o.id}">Recusar e encerrar atendimento</button></div>`;
  if (o.status === 'orcamento' && o.decisaoOrcamento === 'recusado') return `<div class="alert alert-info mt-3">Você recusou este orçamento. A oficina pode enviar uma proposta revisada, ou você pode encerrar o atendimento agora.</div>
   <button class="btn btn-outline-danger btn-sm" data-acao="encerrar-cliente" data-id="${o.id}">Encerrar atendimento</button>`;
  if (o.status === 'aguardando_aprovacao' && o.decisaoOrcamento === 'aprovado') return '<p class="alert alert-success mt-3">Orçamento aprovado. Aguardando início da manutenção pela oficina.</p>';
  if (o.status === 'cancelado') return `<p class="text-muted mt-3">Atendimento encerrado. ${esc(o.motivoCancelamento||'')}</p>`;
  return '';
}
function cartao(o) {
  return `<article class="card auth-card p-4 mb-3" id="ordem-${o.id}">
   <div class="d-flex align-items-center justify-content-between flex-wrap gap-2"><h3 class="h5 fw-bold mb-0">O.S. #${o.id} — ${esc(perfil==='oficina'?o.clienteNome:o.oficinaNome)}</h3>${etiqueta(o.status)}</div>
   <p class="mt-2 mb-1"><strong>Veículo:</strong> ${esc(o.veiculoMarca)} ${esc(o.veiculoModelo)} — ${esc(o.veiculoPlaca)} · <strong>Serviço:</strong> ${esc(o.servicoNome)}</p>
   <p class="small text-muted">Agendamento #${esc(o.agendamentoId)} · ${esc(o.data)} às ${esc(o.horarioInicio)}</p>
   <p><strong>Diagnóstico:</strong> ${o.diagnostico ? esc(o.diagnostico) : 'Aguardando registro pela oficina.'}</p>
   <h4 class="h6 fw-bold">Orçamento ${o.orcamentoVersao?`(versão ${esc(o.orcamentoVersao)})`:''}</h4>${conteudoOrcamento(o)}
   ${o.decisaoOrcamento ? `<p class="small"><strong>Última decisão:</strong> ${o.decisaoOrcamento==='aprovado'?'Aprovado':'Recusado'}${o.motivoRecusa?` — ${esc(o.motivoRecusa)}`:''}</p>` : ''}
   ${perfil==='oficina'?controlesOficina(o):controlesCliente(o)}
  </article>`;
}
function renderizar() {
  $('lista-ordens').innerHTML = ordens.length ? ordens.map(cartao).join('') : '<div class="alert alert-light border">Nenhuma ordem de serviço cadastrada.</div>';
  if (perfil === 'oficina') {
    const recebimentos = $('lista-recebimentos');
    const ativos = pendentes.filter(a=>a.status==='agendado');
    recebimentos.innerHTML = ativos.length ? `<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Data</th><th>Cliente</th><th>Veículo</th><th>Serviço</th><th>Ação</th></tr></thead><tbody>${ativos.map(a=>`<tr><td>${esc(a.data)}<br>${esc(a.horarioInicio)}–${esc(a.horarioFim)}</td><td>${esc(a.clienteNome)}</td><td>${esc(a.veiculoMarca)} ${esc(a.veiculoModelo)} (${esc(a.veiculoPlaca)})</td><td>${esc(a.servicoNome)}</td><td><button class="btn btn-primary btn-sm" data-acao="receber" data-id="${a.id}">Registrar recebimento</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted mb-0">Nenhum veículo aguardando recebimento.</p>';
  }
}
async function carregar() {
  if (carregando) return;
  carregando = true;
  try {
    const resultado = await api('/api/ordens');
    ordens = resultado.ordens || [];
    if (perfil === 'oficina') pendentes = (await api('/api/agendamentos/oficina')).agendamentos || [];
    renderizar();
  } catch (e) {aviso(e.message,true);}
  finally {carregando = false;}
}
async function executar(b) {
  const acao = b.dataset.acao, id = Number(b.dataset.id);
  const ordem = ordens.find(o=>o.id===id);
  let rota, metodo = 'POST', dados;
  if (acao === 'tirar-item') {b.closest('.item-orcamento').remove();return;}
  if (acao === 'novo-item') {
    const div = document.createElement('div'); div.innerHTML = linhaItem(null);
    document.querySelector(`.itens-editor[data-ordem="${id}"]`).append(...div.children); return;
  }
  if (acao === 'receber') {
    if (!confirm('Confirmar o recebimento físico deste veículo e abrir sua ordem de serviço?')) return;
    rota = '/api/ordens/receber'; dados = {agendamentoId:id};
  } else if (!ordem) return;
  else if (acao === 'diagnosticar') {
    rota = `/api/ordens/${id}/diagnostico`; metodo = 'PUT'; dados = {diagnostico:$(`diagnostico-${id}`).value};
  } else if (acao === 'salvar-orcamento') {
    const editor = document.querySelector(`.itens-editor[data-ordem="${id}"]`);
    const itens = [...editor.querySelectorAll('.item-orcamento')].map(row=>({tipo:row.querySelector('.campo-tipo').value,
      descricao:row.querySelector('.campo-descricao').value, quantidade:row.querySelector('.campo-quantidade').value,
      valorUnitario:row.querySelector('.campo-preco').value}));
    if (['aguardando_aprovacao','em_manutencao'].includes(ordem.status) && !confirm('Alterar o orçamento cancela a aprovação anterior e exige nova decisão do cliente. Continuar?'))return;
    rota = `/api/ordens/${id}/orcamento`; metodo = 'PUT'; dados = {itens};
  } else if (acao === 'enviar') {
    if (!confirm('Enviar este orçamento para aprovação do cliente?'))return;
    rota=`/api/ordens/${id}/enviar-orcamento`;
  } else if (acao === 'avancar') {
    if (!confirm(`Confirmar mudança para ${nomes[b.dataset.status]}?`))return;
    rota=`/api/ordens/${id}/avancar`;dados={status:b.dataset.status};
  } else if (acao === 'cancelar-oficina') {
    const motivo=prompt('Informe o motivo do cancelamento da ordem de serviço:');
    if (motivo===null) return;
    rota=`/api/ordens/${id}/cancelar`; dados={motivo};
  } else if (acao === 'decidir' || acao === 'recusar-encerrar') {
    const encerrar = acao === 'recusar-encerrar';
    const decisao = encerrar ? 'recusado' : b.dataset.decisao;
    const pergunta = encerrar ? 'Recusar e encerrar definitivamente este atendimento?' : decisao === 'aprovado' ? 'Aprovar o orçamento apresentado?' : 'Recusar este orçamento e aguardar eventual revisão?';
    if (!confirm(pergunta)) return;
    rota=`/api/ordens/${id}/decisao`; dados={decisao,encerrar,motivo:$(`motivo-${id}`)?.value||''};
  } else if (acao === 'encerrar-cliente') {
    if (!confirm('Encerrar definitivamente este atendimento após a recusa?')) return;
    rota=`/api/ordens/${id}/encerrar`;dados={};
  } else return;
  b.disabled=true;
  try {const resultado=await api(rota,metodo,dados);await carregar();aviso(resultado.mensagem || 'Operação concluída.');}
  catch(e){aviso(e.message,true);}
  finally{b.disabled=false;}
}
document.addEventListener('DOMContentLoaded', async()=>{
  $('btn-sair-os').addEventListener('click',fazerLogout);
  const usuario = await obterUsuarioAtual();
  if (!usuario || !['cliente','oficina'].includes(usuario.perfil)){location.href='/login.html';return;}
  perfil = usuario.perfil;
  $('intro-os').textContent = perfil==='oficina' ? 'Receba veículos, registre diagnóstico e orçamento e acompanhe os serviços até a entrega.' : 'Acompanhe o diagnóstico, confira valores e aprove, recuse ou encerre seu atendimento.';
  if (perfil==='oficina') $('secao-recebimentos').classList.remove('d-none');
  document.body.addEventListener('click',event=>{const b=event.target.closest('[data-acao]');if(b) executar(b);});
  await carregar();
});
})();
