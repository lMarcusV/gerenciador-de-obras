const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDF_DIR } = require('./config');

const INK = '#16202B';
const AMARELO = '#FFC800';
const CINZA = '#5B6773';
const LINHA = '#CDD1D6';

const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const fmtDataHora = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtQtd = (n) => Number(n).toLocaleString('pt-BR');

/**
 * Gera o PDF de uma requisição em storage/pdfs/<arquivo>.
 * Rejeita a promessa se qualquer etapa falhar (o chamador não conclui a solicitação).
 */
function gerarPdf({ requisicao, obra, solicitante, arquivo, versao }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Requisição de Material ${requisicao.codigo}`,
        Author: solicitante.nome,
        Subject: obra.titulo,
      },
    });
    const stream = fs.createWriteStream(path.join(PDF_DIR, arquivo));
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    try {
      const L = 50;

      // Cabeçalho
      doc.rect(0, 0, 595, 90).fill(INK);
      doc.rect(0, 90, 595, 6).fill(AMARELO);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('Requisição de Material', L, 30);
      doc.fillColor(AMARELO).font('Helvetica').fontSize(11).text(`${requisicao.codigo}  |  versão ${versao}`, L, 58);

      // Dados gerais
      const campos = [
        ['Requisição', requisicao.codigo],
        ['Status', requisicao.status],
        ['Obra', obra.titulo],
        ['Data da solicitação', fmtData(requisicao.data)],
        ['Solicitante', `${solicitante.nome} (${solicitante.email})`],
        ['Registrada em', fmtDataHora(requisicao.historico[0]?.data || new Date())],
      ];
      campos.forEach(([rotulo, valor], i) => {
        const x = L + (i % 2) * 250;
        const y = 122 + Math.floor(i / 2) * 44;
        doc.fillColor(CINZA).font('Helvetica').fontSize(9).text(rotulo, x, y, { width: 235 });
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(String(valor), x, y + 13, {
          width: 235,
          height: 26,
          ellipsis: true,
        });
      });

      // Tabela de materiais
      const cols = [
        { t: 'Item', w: 35 },
        { t: 'Descrição do material', w: 205 },
        { t: 'Qtd.', w: 50 },
        { t: 'Unid.', w: 50 },
        { t: 'Observações', w: 155 },
      ];
      let y = 270;

      const cabecalhoTabela = () => {
        doc.rect(L, y, 495, 22).fill(INK);
        let x = L;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        cols.forEach((c) => {
          doc.text(c.t, x + 5, y + 7, { width: c.w - 10 });
          x += c.w;
        });
        y += 22;
      };
      cabecalhoTabela();

      requisicao.itens.forEach((item, i) => {
        doc.font('Helvetica').fontSize(10);
        const obs = item.observacao || '';
        const h =
          Math.max(
            doc.heightOfString(item.descricao, { width: cols[1].w - 10 }),
            doc.heightOfString(obs, { width: cols[4].w - 10 }),
            12
          ) + 12;

        if (y + h > 760) {
          doc.addPage();
          y = 50;
          cabecalhoTabela();
        }
        if (i % 2 === 1) doc.rect(L, y, 495, h).fill('#F3F4F6');

        let x = L;
        const valores = [String(i + 1), item.descricao, fmtQtd(item.quantidade), item.unidade || '-', obs || '-'];
        doc.fillColor(INK).font('Helvetica').fontSize(10);
        valores.forEach((v, c) => {
          doc.text(v, x + 5, y + 6, { width: cols[c].w - 10 });
          x += cols[c].w;
        });
        y += h;
        doc.moveTo(L, y).lineTo(L + 495, y).lineWidth(0.5).strokeColor(LINHA).stroke();
      });

      // Observações gerais
      if (requisicao.observacoes) {
        y += 18;
        doc.font('Helvetica').fontSize(10);
        const h = doc.heightOfString(requisicao.observacoes, { width: 495 }) + 24;
        if (y + h > 760) {
          doc.addPage();
          y = 50;
        }
        doc.fillColor(CINZA).font('Helvetica').fontSize(9).text('Observações gerais', L, y);
        doc.fillColor(INK).fontSize(10).text(requisicao.observacoes, L, y + 13, { width: 495 });
        y += h;
      }

      // Rodapé
      y += 24;
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
      doc
        .fillColor(CINZA)
        .font('Helvetica')
        .fontSize(8)
        .text(`Documento gerado automaticamente pelo Gerenciador de Obras em ${fmtDataHora(new Date())}.`, L, y, {
          width: 495,
        });

      doc.end();
    } catch (e) {
      doc.end();
      reject(e);
    }
  });
}

module.exports = { gerarPdf };
