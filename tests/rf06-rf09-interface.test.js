const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const ler=p=>fs.readFileSync(path.join(root,p),'utf8');

test('RF06: página de veículos possui formulário e carregamento de dados',()=>{
 const html=ler('public/veiculos.html');const js=ler('public/js/veiculos.js');
 assert.match(html,/id="form-veiculo"/);assert.match(js,/\/api\/veiculos/);
 assert.match(html,/id="placa"/);assert.match(js,/inativar/);
});
test('RF07: agendamento público do perfil redireciona para a jornada',()=>{
 const html=ler('public/oficina.html');const js=ler('public/js/agendar.js');
 assert.match(html,/id="btn-agendar-oficina"/);assert.match(html,/\/agendar\.html\?oficinaId=/);
 assert.match(js,/\/api\/agendamentos\/horarios/);assert.match(js,/\/api\/agendamentos/);
});
test('RF08: página do cliente oferece cancelamento e reagendamento',()=>{
 const html=ler('public/agendamentos.html');const js=ler('public/js/agendamentos.js');
 assert.match(html,/Meus agendamentos/);assert.match(js,/\/cancelar/);
 assert.match(js,/method:'PUT'/);
});
test('RF09: painel de oficina exibe agenda com filtro e dados do cliente',()=>{
 const html=ler('public/dashboard.html');const js=ler('public/js/agenda-oficina.js');
 assert.match(html,/id="secao-agenda-oficina"/);assert.match(html,/id="filtro-agenda-data"/);
 assert.match(js,/\/api\/agendamentos\/oficina/);assert.match(js,/clienteNome/);
});
test('RN04 e RNF10: criação de reserva usa transação, trava, auditoria',()=>{
 const js=ler('src/services/agendamentoService.js');
 assert.match(js,/await client\.query\('BEGIN'\)/);
 assert.match(js,/await client\.query\('COMMIT'\)/);
 assert.match(js,/await client\.query\('ROLLBACK'\)/);
 assert.match(js,/FOR UPDATE/);assert.match(js,/agendamento_eventos/);
});
test('RN14: disponibilidade inativada preserva referências históricas',()=>{
 const js=ler('src/database/repositories/disponibilidadeRepository.js');
 assert.match(js,/UPDATE disponibilidades SET ativo = false/);
 assert.doesNotMatch(js,/DELETE FROM disponibilidades/);
});
