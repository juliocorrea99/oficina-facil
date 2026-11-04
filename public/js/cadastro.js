document.addEventListener('DOMContentLoaded', async () => {
  // Se já estiver logado, redireciona para o painel
  const usuario = await obterUsuarioAtual();
  if (usuario) {
    window.location.href = '/dashboard.html';
    return;
  }

  const formCadastro = document.getElementById('form-cadastro');
  const btnSubmit = document.getElementById('btn-submit-cadastro');
  const perfilClienteRadio = document.getElementById('perfil-cliente');
  const perfilOficinaRadio = document.getElementById('perfil-oficina');
  const camposCliente = document.getElementById('campos-cliente');
  const camposOficina = document.getElementById('campos-oficina');

  // Alterna exibição dos campos de acordo com o perfil
  function atualizarPerfilFormulario() {
    const isOficina = perfilOficinaRadio.checked;
    if (isOficina) {
      camposOficina.classList.remove('d-none');
      camposCliente.classList.add('d-none');
      document.getElementById('label-nome').textContent = 'Nome do Responsável *';
    } else {
      camposOficina.classList.add('d-none');
      camposCliente.classList.remove('d-none');
      document.getElementById('label-nome').textContent = 'Nome Completo *';
    }
  }

  perfilClienteRadio.addEventListener('change', atualizarPerfilFormulario);
  perfilOficinaRadio.addEventListener('change', atualizarPerfilFormulario);
  atualizarPerfilFormulario();

  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparAlerta('alerta-cadastro');

    const isOficina = perfilOficinaRadio.checked;
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    const errosFront = [];

    if (!nome) errosFront.push('O campo Nome é obrigatório.');
    if (!email) errosFront.push('O campo E-mail é obrigatório.');
    if (!senha) errosFront.push('O campo Senha é obrigatório.');
    if (senha && senha.length < 6) errosFront.push('A senha deve ter no mínimo 6 caracteres.');
    if (senha !== confirmarSenha) errosFront.push('As senhas digitadas não coincidem.');

    let payload = {
      nome,
      email,
      telefone: telefone || null,
      senha,
      confirmarSenha
    };

    let urlEndpoint = '/api/auth/cadastro/cliente';

    if (isOficina) {
      urlEndpoint = '/api/auth/cadastro/oficina';
      const nomeFantasia = document.getElementById('nomeFantasia').value.trim();
      const razaoSocial = document.getElementById('razaoSocial').value.trim();
      const cnpj = document.getElementById('cnpj').value.trim();
      const cep = document.getElementById('cep').value.trim();
      const logradouro = document.getElementById('logradouro').value.trim();
      const numero = document.getElementById('numero').value.trim();
      const complemento = document.getElementById('complemento').value.trim();
      const bairro = document.getElementById('bairro').value.trim();
      const cidade = document.getElementById('cidade').value.trim();
      const uf = document.getElementById('uf').value.trim().toUpperCase();
      const descricao = document.getElementById('descricao').value.trim();

      if (!nomeFantasia) errosFront.push('Nome Fantasia da oficina é obrigatório.');
      if (!cnpj) errosFront.push('CNPJ é obrigatório.');
      if (!cidade) errosFront.push('Cidade é obrigatória.');
      if (!uf) errosFront.push('UF é obrigatória.');

      payload = {
        ...payload,
        nomeFantasia,
        razaoSocial: razaoSocial || null,
        cnpj,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade,
        uf,
        descricao: descricao || null
      };
    } else {
      const cpf = document.getElementById('cpf').value.trim();
      payload.cpf = cpf || null;
    }

    if (errosFront.length > 0) {
      exibirAlerta('alerta-cadastro', 'Por favor, corrija os erros abaixo:', 'danger', errosFront);
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cadastrando...';

    try {
      const response = await fetch(urlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        exibirAlerta('alerta-cadastro', data.mensagem || 'Falha ao realizar cadastro.', 'danger', data.erros);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Criar Conta';
        return;
      }

      exibirAlerta('alerta-cadastro', `${data.mensagem} Redirecionando ao painel...`, 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 700);
    } catch (error) {
      console.error('Erro na requisição de cadastro:', error);
      exibirAlerta('alerta-cadastro', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Criar Conta';
    }
  });
});
