/* RF15 — Mensagens de retorno padronizadas e acessíveis para ações da plataforma. */
(function (raiz) {
  'use strict';
  const tipos = {sucesso:'success',erro:'danger',alerta:'warning',info:'info'};
  function mostrar(alvo, mensagem, tipo='sucesso') {
    const area = typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
    if (!area) return false;
    const nivel = Object.hasOwn(tipos, tipo) ? tipo : 'info';
    const elemento = document.createElement('div');
    elemento.className = `alert alert-${tipos[nivel]}`;
    elemento.setAttribute('role', nivel === 'erro' ? 'alert' : 'status');
    elemento.textContent = String(mensagem ?? ''); // Nunca interpreta HTML do usuário/servidor.
    area.setAttribute('aria-live', nivel === 'erro' ? 'assertive' : 'polite');
    area.replaceChildren(elemento);
    return true;
  }
  function limpar(alvo) {
    const area = typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
    if (area) area.replaceChildren();
  }
  raiz.OficinaFeedback = Object.freeze({mostrar,limpar});
})(window);
