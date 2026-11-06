(() => {
  'use strict';
  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }
  async function carregar() {
    const alvo = document.getElementById('secao-avaliacoes');
    if (!alvo) return;
    const oficinaId = new URLSearchParams(location.search).get('id');
    if (!/^\d+$/.test(oficinaId || '')) return;
    try {
      const r = await fetch(`/api/oficinas/${encodeURIComponent(oficinaId)}/avaliacoes`, {headers:{Accept:'application/json'}});
      const d = await r.json();
      if (!r.ok || d.sucesso === false) throw Error(d.mensagem || 'Não foi possível carregar as avaliações.');
      alvo.replaceChildren();
      if (!d.quantidade) {
        alvo.append(elemento('p','text-muted mb-0','Esta oficina ainda não possui avaliações cadastradas.'));
        return;
      }
      const media = Number(d.media).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
      alvo.append(elemento('p','fw-semibold mb-3',`${media} de 5 estrelas · ${d.quantidade} avaliação(ões)`));
      const lista = elemento('div','d-grid gap-3');
      for (const a of d.avaliacoes || []) {
        const card = elemento('article','border rounded p-3 bg-white');
        const nota = Number(a.nota);
        card.append(elemento('p','fw-semibold mb-1',`${'★'.repeat(nota)}${'☆'.repeat(5-nota)} (${nota}/5)`));
        card.append(elemento('p','mb-0 text-break',String(a.comentario ?? '')));
        lista.append(card);
      }
      alvo.append(lista);
    } catch(e) {
      alvo.replaceChildren(elemento('p','text-danger mb-0',e.message || 'Não foi possível carregar as avaliações.'));
    }
  }
  document.addEventListener('DOMContentLoaded',carregar);
})();
