document.addEventListener('DOMContentLoaded', async () => {
  // Se já estiver logado, redireciona para o painel
  const usuario = await obterUsuarioAtual();
  if (usuario) {
    window.location.href = '/dashboard.html';
    return;
  }

  const formLogin = document.getElementById('form-login');
  const btnSubmit = document.getElementById('btn-submit-login');
  const btnToggleSenha = document.getElementById('btn-toggle-senha');
  const inputSenha = document.getElementById('senha');

  // Alternar visibilidade da senha
  if (btnToggleSenha && inputSenha) {
    btnToggleSenha.addEventListener('click', () => {
      const tipoAtual = inputSenha.getAttribute('type');
      const novoTipo = tipoAtual === 'password' ? 'text' : 'password';
      inputSenha.setAttribute('type', novoTipo);
      btnToggleSenha.textContent = novoTipo === 'password' ? 'Mostrar' : 'Ocultar';
    });
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparAlerta('alerta-login');

    const email = document.getElementById('email').value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
      exibirAlerta('alerta-login', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Entrando...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        exibirAlerta('alerta-login', data.mensagem || 'Falha ao autenticar.', 'danger', data.erros);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Entrar';
        return;
      }

      exibirAlerta('alerta-login', 'Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 700);
    } catch (error) {
      console.error('Erro na requisição de login:', error);
      exibirAlerta('alerta-login', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Entrar';
    }
  });
});
