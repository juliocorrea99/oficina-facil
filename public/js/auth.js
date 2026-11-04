/**
 * Utilitários compartilhados de autenticação no front-end.
 */

async function obterUsuarioAtual() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sucesso ? data.usuario : null;
  } catch (error) {
    console.warn('Não foi possível verificar a sessão atual:', error);
    return null;
  }
}

async function fazerLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao efetuar logout:', error);
  } finally {
    window.location.href = '/login.html';
  }
}

function exibirAlerta(containerId, mensagem, tipo = 'danger', listaErros = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let errosHtml = '';
  if (Array.isArray(listaErros) && listaErros.length > 0) {
    errosHtml = '<ul class="mb-0 mt-2 ps-3">' +
      listaErros.map(e => `<li>${e}</li>`).join('') +
      '</ul>';
  }

  container.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      <div>${mensagem}</div>
      ${errosHtml}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function limparAlerta(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}

function inicializarNavbar(usuario) {
  const navContainer = document.getElementById('navbar-auth-links');
  if (!navContainer) return;

  if (usuario) {
    const perfilBadge = usuario.perfil === 'oficina'
      ? '<span class="badge bg-success ms-1">Oficina</span>'
      : '<span class="badge bg-primary ms-1">Cliente</span>';

    navContainer.innerHTML = `
      <span class="navbar-text me-3 text-dark">
        Olá, <strong>${usuario.nome}</strong> ${perfilBadge}
      </span>
      <a href="/dashboard.html" class="btn btn-outline-primary btn-sm me-2">Meu Painel</a>
      <button id="btn-logout" class="btn btn-outline-danger btn-sm">Sair</button>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', fazerLogout);
  } else {
    navContainer.innerHTML = `
      <a href="/login.html" class="btn btn-outline-primary btn-sm me-2">Entrar</a>
      <a href="/cadastro.html" class="btn btn-primary btn-sm">Cadastrar-se</a>
    `;
  }
}

// Inicializa verificação de sessão nas páginas que possuem navbar
document.addEventListener('DOMContentLoaded', async () => {
  const usuario = await obterUsuarioAtual();
  inicializarNavbar(usuario);
});
