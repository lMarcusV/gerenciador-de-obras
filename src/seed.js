const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Usuario, Obra, Foto } = require('./db');
const { criarRequisicao } = require('./requisicoes');
const { FOTOS_DIR } = require('./config');

const SENHA_PADRAO = 'senha123';

// Imagem de exemplo (SVG) para as fotos de teste, sem depender de arquivos externos.
function criarFotoDeTeste(nome, titulo, legenda, cor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="${cor}"/>
<path d="M80 520h640M140 520V300l130-90 130 90v220M470 520V180h160v340M470 260h160M470 340h160M470 420h160" fill="none" stroke="#ffffff66" stroke-width="3"/>
<text x="40" y="70" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${titulo}</text>
<text x="40" y="110" font-family="Arial, sans-serif" font-size="22" fill="#ffffffcc">${legenda}</text>
</svg>`;
  fs.writeFileSync(path.join(FOTOS_DIR, nome), svg);
  return { nomeArquivo: nome, url: `/storage/fotos/${nome}`, mimetype: 'image/svg+xml', tamanho: Buffer.byteLength(svg) };
}

async function seed() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const [carlos, ana, roberto] = await Usuario.insertMany([
    { nome: 'Carlos Mendes', email: 'carlos@obras.com', senhaHash },
    { nome: 'Ana Souza', email: 'ana@obras.com', senhaHash },
    { nome: 'Roberto Lima', email: 'roberto@obras.com', senhaHash },
  ]);

  const [aurora, escola, galpao] = await Obra.insertMany([
    {
      titulo: 'Edifício Residencial Aurora',
      descricao: 'Torre residencial de 12 pavimentos com 48 apartamentos e garagem subterrânea.',
      endereco: 'Av. Djalma Batista, 1200 - Manaus, AM',
      dataInicioPrevista: new Date('2026-03-02'),
      status: 'Em andamento',
      criadoPor: carlos._id,
    },
    {
      titulo: 'Reforma da Escola Municipal Rio Negro',
      descricao: 'Troca de cobertura, instalações elétricas e pintura geral das salas de aula.',
      endereco: 'Rua Rio Içá, 85 - Manaus, AM',
      dataInicioPrevista: new Date('2026-12-01'),
      status: 'Planejada',
      criadoPor: ana._id,
    },
    {
      titulo: 'Galpão Logístico Distrito',
      descricao: 'Galpão de 3.000 m² com docas de carga e escritório administrativo.',
      endereco: 'Av. Buriti, 4500 - Distrito Industrial, Manaus, AM',
      dataInicioPrevista: new Date('2025-08-10'),
      status: 'Concluída',
      criadoPor: roberto._id,
    },
  ]);

  // Fotos de exemplo
  const fotos = [
    [aurora, carlos, 'aurora-fundacao.svg', 'Fundação concluída', 'Edifício Aurora - março/2026', '#3B5B7A', '2026-03-20'],
    [aurora, ana, 'aurora-estrutura.svg', 'Estrutura do 3º pavimento', 'Edifício Aurora - junho/2026', '#8A5A2B', '2026-06-12'],
    [galpao, roberto, 'galpao-entrega.svg', 'Entrega da obra', 'Galpão Logístico Distrito', '#4F6B4A', '2026-02-05'],
  ];
  for (const [obra, usuario, arquivo, titulo, legenda, cor, data] of fotos) {
    const info = criarFotoDeTeste(arquivo, titulo, legenda, cor);
    await Foto.create({
      obra: obra._id,
      nomeOriginal: arquivo,
      enviadoPor: usuario._id,
      enviadoEm: new Date(data),
      ...info,
    });
  }

  // Requisições de exemplo (cada uma já gera seu PDF)
  await criarRequisicao({
    obra: aurora,
    solicitante: carlos,
    data: new Date('2026-03-18'),
    observacoes: 'Entrega até sexta-feira na portaria da obra.',
    itens: [
      { descricao: 'Cimento CP II 50 kg', quantidade: 200, unidade: 'sc' },
      { descricao: 'Areia média lavada', quantidade: 18, unidade: 'm³' },
      { descricao: 'Vergalhão CA-50 10 mm', quantidade: 120, unidade: 'barras', observacao: 'Barras de 12 m' },
    ],
  });
  await criarRequisicao({
    obra: aurora,
    solicitante: ana,
    data: new Date('2026-06-10'),
    itens: [
      { descricao: 'Tijolo cerâmico 8 furos', quantidade: 5000, unidade: 'un' },
      { descricao: 'Argamassa colante AC-II', quantidade: 60, unidade: 'sc' },
    ],
  });
  await criarRequisicao({
    obra: galpao,
    solicitante: roberto,
    data: new Date('2025-09-02'),
    itens: [
      { descricao: 'Telha trapezoidal galvanizada', quantidade: 420, unidade: 'm²' },
      { descricao: 'Parafuso autobrocante 5,5 x 25', quantidade: 3000, unidade: 'un', observacao: 'Com arruela de vedação' },
    ],
  });

  console.log('Dados de teste carregados: 3 usuários, 3 obras, 3 fotos e 3 requisições com PDF.');
  console.log(`  Usuários: carlos@obras.com, ana@obras.com, roberto@obras.com (senha: ${SENHA_PADRAO})`);
}

module.exports = seed;
