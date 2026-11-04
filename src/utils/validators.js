/**
 * Utilitários de validação para os dados de entrada do sistema.
 */

const UFS_VALIDAS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

/**
 * Valida o formato de um endereço de e-mail.
 */
function validarEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Valida a senha conforme requisitos mínimos de segurança (mínimo 6 caracteres).
 */
function validarSenha(senha) {
  if (!senha || typeof senha !== 'string') return false;
  return senha.length >= 6;
}

/**
 * Valida UF brasileira (2 letras válidas).
 */
function validarUf(uf) {
  if (!uf || typeof uf !== 'string') return false;
  return UFS_VALIDAS.has(uf.trim().toUpperCase());
}

/**
 * Limpa caracteres não numéricos de uma string.
 */
function apenasDigitos(valor) {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
}

/**
 * Valida algoritmo de CNPJ (14 dígitos).
 */
function validarCnpj(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return false;
  const digitos = apenasDigitos(cnpj);
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false; // Bloqueia sequências repetidas

  // Cálculo do primeiro dígito verificador
  let tamanho = digitos.length - 2;
  let numeros = digitos.substring(0, tamanho);
  const digitosVerificadores = digitos.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitosVerificadores.charAt(0), 10)) return false;

  // Cálculo do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = digitos.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitosVerificadores.charAt(1), 10)) return false;

  return true;
}

/**
 * Valida algoritmo de CPF (11 dígitos).
 */
function validarCpf(cpf) {
  if (!cpf || typeof cpf !== 'string') return false;
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  let soma = 0;
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(digitos.substring(i - 1, i), 10) * (11 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digitos.substring(9, 10), 10)) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(digitos.substring(i - 1, i), 10) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digitos.substring(10, 11), 10)) return false;

  return true;
}

module.exports = {
  validarEmail,
  validarSenha,
  validarUf,
  validarCnpj,
  validarCpf,
  apenasDigitos
};
