const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');

const { Usuario, Obra, Foto, Requisicao, STATUS_OBRA } = require('./db');
const { autenticar, gerarToken } = require('./auth');
const { criarRequisicao } = require('./requisicoes');
const { FOTOS_DIR, PDF_DIR } = require('./config');

const router = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const dataValida = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ------------------------------ Login e cadastro ------------------------------ */

router.post(
  '/auth/cadastro',
  wrap(async (req, res) => {
    const nome = texto(req.body?.nome);
    const email = texto(req.body?.email).toLowerCase();
    const senha = req.body?.senha;

    if (!nome) throw erro(400, 'Informe o nome.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw erro(400, 'Informe um e-mail válido.');
    if (typeof senha !== 'string' || senha.length < 6) {
      throw erro(400, 'A senha deve ter pelo menos 6 caracteres.');
    }
    if (await Usuario.exists({ email })) throw erro(409, 'Já existe uma conta com este e-mail.');

    const usuario = await Usuario.create({ nome, email, senhaHash: await bcrypt.hash(senha, 10) });
    res.status(201).json({ token: gerarToken(usuario), usuario });
  })
);

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const email = texto(req.body?.email).toLowerCase();
    const senha = req.body?.senha;
    const usuario = email && (await Usuario.findOne({ email }));
    const ok = usuario && typeof senha === 'string' && (await bcrypt.compare(senha, usuario.senhaHash));
    if (!ok) throw erro(401, 'E-mail ou senha incorretos.');
    res.json({ token: gerarToken(usuario), usuario });
  })
);

/* ---------------------------------- Middlewares --------------------------------- */

const carregarObra = wrap(async (req, res, next) => {
  const { obraId } = req.params;
  const obra = mongoose.isValidObjectId(obraId) && (await Obra.findById(obraId).populate('criadoPor', 'nome email'));
  if (!obra) throw erro(404, 'Obra não encontrada.');
  req.obra = obra;
  next();
});

// Obras canceladas ficam disponíveis só para consulta histórica.
const exigirObraAtiva = (req, res, next) =>
  req.obra.status === 'Cancelada'
    ? next(erro(409, 'Esta obra foi cancelada e está disponível apenas para consulta.'))
    : next();

const reqDTO = (r) => ({ ...r.toJSON(), pdfUrl: `/api/requisicoes/${r.id}/pdf` });

/* ------------------------------------ Obras ------------------------------------- */

router.get(
  '/obras',
  autenticar,
  wrap(async (req, res) => {
    const filtro = {};
    if (req.query.status) filtro.status = String(req.query.status);

    const [obras, fotos, requisicoes] = await Promise.all([
      Obra.find(filtro).sort({ createdAt: -1 }).populate('criadoPor', 'nome email'),
      Foto.aggregate([{ $group: { _id: '$obra', total: { $sum: 1 } } }]),
      Requisicao.aggregate([{ $group: { _id: '$obra', total: { $sum: 1 } } }]),
    ]);
    const mapa = (lista) => Object.fromEntries(lista.map((x) => [String(x._id), x.total]));
    const totalFotos = mapa(fotos);
    const totalRequisicoes = mapa(requisicoes);

    res.json(
      obras.map((o) => ({
        ...o.toJSON(),
        totalFotos: totalFotos[o.id] || 0,
        totalRequisicoes: totalRequisicoes[o.id] || 0,
      }))
    );
  })
);

router.post(
  '/obras',
  autenticar,
  wrap(async (req, res) => {
    const { descricao, endereco, status } = req.body || {};
    const titulo = texto(req.body?.titulo);
    if (!titulo) throw erro(400, 'Informe o título da obra.');
    if (!req.body?.dataInicioPrevista) throw erro(400, 'Informe a data de início prevista.');
    const dataInicioPrevista = dataValida(req.body.dataInicioPrevista);
    if (!dataInicioPrevista) throw erro(400, 'A data de início prevista é inválida (use AAAA-MM-DD).');
    if (status && !STATUS_OBRA.includes(status)) {
      throw erro(400, `Status inválido. Use: ${STATUS_OBRA.join(', ')}.`);
    }

    const obra = await Obra.create({
      titulo,
      descricao: texto(descricao) || undefined,
      endereco: texto(endereco) || undefined,
      dataInicioPrevista,
      status: status || 'Planejada',
      criadoPor: req.usuario._id,
    });
    await obra.populate('criadoPor', 'nome email');
    res.status(201).json({ ...obra.toJSON(), totalFotos: 0, totalRequisicoes: 0 });
  })
);

router.get(
  '/obras/:obraId',
  autenticar,
  carregarObra,
  wrap(async (req, res) => {
    const [totalFotos, totalRequisicoes] = await Promise.all([
      Foto.countDocuments({ obra: req.obra._id }),
      Requisicao.countDocuments({ obra: req.obra._id }),
    ]);
    res.json({ ...req.obra.toJSON(), totalFotos, totalRequisicoes });
  })
);

const CAMPOS_OBRA = ['titulo', 'descricao', 'endereco', 'dataInicioPrevista', 'status'];
const atualizarObra = async (req, res, substituir) => {
  const corpo = req.body || {};
  const campos = Object.keys(corpo);
  if (!campos.length || campos.some((campo) => !CAMPOS_OBRA.includes(campo))) {
    throw erro(400, 'Informe campos válidos para atualizar a obra.');
  }

  if (substituir) {
    const faltando = CAMPOS_OBRA.filter((campo) => !Object.hasOwn(corpo, campo));
    if (faltando.length) throw erro(400, `O PUT exige todos os campos: ${CAMPOS_OBRA.join(', ')}.`);
  }

  const atualizacao = {};
  for (const campo of campos) {
    if (campo === 'titulo') {
      atualizacao.titulo = texto(corpo.titulo);
      if (!atualizacao.titulo) throw erro(400, 'Informe o título da obra.');
    } else if (campo === 'descricao' || campo === 'endereco') {
      atualizacao[campo] = texto(corpo[campo]) || undefined;
    } else if (campo === 'dataInicioPrevista') {
      atualizacao.dataInicioPrevista = dataValida(corpo.dataInicioPrevista);
      if (!atualizacao.dataInicioPrevista) throw erro(400, 'A data de início prevista é inválida (use AAAA-MM-DD).');
    } else if (campo === 'status') {
      if (!STATUS_OBRA.includes(corpo.status)) {
        throw erro(400, `Status inválido. Use: ${STATUS_OBRA.join(', ')}.`);
      }
      atualizacao.status = corpo.status;
    }
  }

  if (substituir) {
    atualizacao.descricao = texto(corpo.descricao) || undefined;
    atualizacao.endereco = texto(corpo.endereco) || undefined;
  }

  const obra = await Obra.findByIdAndUpdate(req.obra._id, { $set: atualizacao }, { new: true, runValidators: true })
    .populate('criadoPor', 'nome email');
  const [totalFotos, totalRequisicoes] = await Promise.all([
    Foto.countDocuments({ obra: obra._id }),
    Requisicao.countDocuments({ obra: obra._id }),
  ]);
  res.json({ ...obra.toJSON(), totalFotos, totalRequisicoes });
};

router.patch('/obras/:obraId', autenticar, carregarObra, wrap((req, res) => atualizarObra(req, res, false)));
router.put('/obras/:obraId', autenticar, carregarObra, wrap((req, res) => atualizarObra(req, res, true)));

/* ------------------------------------ Fotos ------------------------------------- */

const EXTENSOES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, FOTOS_DIR),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXTENSOES[file.mimetype]}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    EXTENSOES[file.mimetype]
      ? cb(null, true)
      : cb(erro(400, 'Apenas imagens JPG, PNG, WEBP ou GIF são permitidas.')),
});

router.get(
  '/obras/:obraId/fotos',
  autenticar,
  carregarObra,
  wrap(async (req, res) => {
    const fotos = await Foto.find({ obra: req.obra._id }).sort({ enviadoEm: -1 }).populate('enviadoPor', 'nome email');
    res.json(fotos);
  })
);

router.post(
  '/obras/:obraId/fotos',
  autenticar,
  carregarObra,
  exigirObraAtiva,
  upload.array('fotos', 10),
  wrap(async (req, res) => {
    if (!req.files?.length) throw erro(400, 'Envie ao menos uma foto no campo "fotos".');
    try {
      const fotos = await Foto.insertMany(
        req.files.map((f) => ({
          obra: req.obra._id,
          nomeArquivo: f.filename,
          // O multer entrega o nome original em latin1; converte para UTF-8 para preservar acentos.
          nomeOriginal: Buffer.from(f.originalname, 'latin1').toString('utf8'),
          url: `/storage/fotos/${f.filename}`,
          mimetype: f.mimetype,
          tamanho: f.size,
          enviadoPor: req.usuario._id,
        }))
      );
      await Foto.populate(fotos, { path: 'enviadoPor', select: 'nome email' });
      res.status(201).json(fotos);
    } catch (e) {
      await Promise.all(req.files.map((f) => fs.promises.rm(f.path, { force: true })));
      throw e;
    }
  })
);

router.delete(
  '/obras/:obraId/fotos/:fotoId',
  autenticar,
  carregarObra,
  exigirObraAtiva,
  wrap(async (req, res) => {
    const fotoId = req.params.fotoId;
    const foto = mongoose.isValidObjectId(fotoId) && (await Foto.findOne({ _id: fotoId, obra: req.obra._id }));
    if (!foto) throw erro(404, 'Foto não encontrada nesta obra.');

    await fs.promises.rm(path.join(FOTOS_DIR, path.basename(foto.nomeArquivo)), { force: true });
    await foto.deleteOne();
    res.status(204).end();
  })
);

/* ------------------------------ Requisições de material ------------------------------ */

router.get(
  '/obras/:obraId/requisicoes',
  autenticar,
  carregarObra,
  wrap(async (req, res) => {
    const lista = await Requisicao.find({ obra: req.obra._id })
      .sort({ numero: -1 })
      .populate('solicitante', 'nome email');
    res.json(lista.map(reqDTO));
  })
);

router.post(
  '/obras/:obraId/requisicoes',
  autenticar,
  carregarObra,
  exigirObraAtiva,
  wrap(async (req, res) => {
    const { itens, observacoes } = req.body || {};
    if (!Array.isArray(itens) || itens.length === 0) {
      throw erro(400, 'Informe ao menos um item de material.');
    }

    const itensLimpos = itens.map((item, i) => {
      const descricao = texto(item?.descricao);
      const quantidade = Number(item?.quantidade);
      if (!descricao) throw erro(400, `Item ${i + 1}: informe a descrição do material.`);
      if (!(quantidade > 0)) throw erro(400, `Item ${i + 1}: informe uma quantidade maior que zero.`);
      return {
        descricao,
        quantidade,
        unidade: texto(item.unidade) || undefined,
        observacao: texto(item.observacao) || undefined,
      };
    });

    // Sem data informada, usa o dia de hoje.
    const data = req.body?.data ? dataValida(req.body.data) : new Date(new Date().toISOString().slice(0, 10));
    if (!data) throw erro(400, 'A data da solicitação é inválida (use AAAA-MM-DD).');

    const doc = await criarRequisicao({
      obra: req.obra,
      solicitante: req.usuario,
      data,
      itens: itensLimpos,
      observacoes: texto(observacoes),
    });
    await doc.populate('solicitante', 'nome email');
    res.status(201).json(reqDTO(doc));
  })
);

const carregarRequisicao = wrap(async (req, res, next) => {
  const { requisicaoId } = req.params;
  const doc =
    mongoose.isValidObjectId(requisicaoId) &&
    (await Requisicao.findById(requisicaoId)
      .populate('solicitante', 'nome email')
      .populate('obra', 'titulo status')
      .populate('historico.usuario', 'nome'));
  if (!doc) throw erro(404, 'Requisição não encontrada.');
  req.requisicao = doc;
  next();
});

router.get('/requisicoes/:requisicaoId', autenticar, carregarRequisicao, (req, res) => {
  res.json(reqDTO(req.requisicao));
});

router.get('/requisicoes/:requisicaoId/pdf', autenticar, carregarRequisicao, (req, res, next) => {
  const { pdfs } = req.requisicao;
  const versao = req.query.versao ? Number(req.query.versao) : Math.max(...pdfs.map((p) => p.versao));
  const pdf = pdfs.find((p) => p.versao === versao);
  if (!pdf) return next(erro(404, 'Versão do PDF não encontrada.'));
  const caminho = path.join(PDF_DIR, pdf.arquivo);
  if (!fs.existsSync(caminho)) return next(erro(404, 'O arquivo PDF não está disponível.'));
  res.download(caminho, pdf.arquivo);
});

module.exports = router;
