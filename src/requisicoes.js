const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Requisicao, proximoNumero } = require('./db');
const { gerarPdf } = require('./pdf');
const { PDF_DIR } = require('./config');

const removerArquivo = (arquivo) => fs.promises.rm(path.join(PDF_DIR, arquivo), { force: true });

/**
 * Registra uma requisição de material e gera o PDF vinculado.
 * A requisição só é gravada se o PDF for gerado e armazenado com sucesso;
 * se o PDF falhar, nada é salvo e o erro é devolvido ao chamador.
 */
async function criarRequisicao({ obra, solicitante, data, itens, observacoes }) {
  const agora = new Date();
  const doc = new Requisicao({
    _id: new mongoose.Types.ObjectId(),
    numero: proximoNumero(),
    obra: obra._id,
    solicitante: solicitante._id,
    data,
    status: 'Solicitada',
    observacoes: observacoes || undefined,
    itens,
    historico: [
      { status: 'Solicitada', descricao: 'Solicitação registrada', usuario: solicitante._id, data: agora },
    ],
  });
  await doc.validate();

  const versao = 1;
  const arquivo = `${doc.codigo.toLowerCase()}-v${versao}.pdf`;

  try {
    await gerarPdf({ requisicao: doc, obra, solicitante, arquivo, versao });
  } catch (e) {
    console.error('Falha ao gerar PDF:', e);
    await removerArquivo(arquivo);
    const erro = new Error('Não foi possível gerar o PDF. A solicitação não foi registrada.');
    erro.status = 500;
    throw erro;
  }

  doc.pdfs.push({ versao, arquivo, geradoEm: new Date() });
  try {
    await doc.save();
  } catch (e) {
    await removerArquivo(arquivo);
    throw e;
  }
  return doc;
}

module.exports = { criarRequisicao };
