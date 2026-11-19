const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Todo documento sai como JSON com "id" (sem _id) e nunca expõe o hash da senha.
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.senhaHash;
    return ret;
  },
});

const { Schema } = mongoose;

const STATUS_OBRA = ['Planejada', 'Em andamento', 'Concluída', 'Cancelada'];
const STATUS_REQUISICAO = ['Rascunho', 'Solicitada', 'Aprovada', 'Rejeitada', 'Atendida'];

const ref = (modelo) => ({ type: Schema.Types.ObjectId, ref: modelo, required: true });

const Usuario = mongoose.model(
  'Usuario',
  new Schema(
    {
      nome: { type: String, required: [true, 'Informe o nome.'], trim: true },
      email: {
        type: String,
        required: [true, 'Informe o e-mail.'],
        unique: true,
        lowercase: true,
        trim: true,
      },
      senhaHash: { type: String, required: true },
    },
    { timestamps: true }
  )
);

const Obra = mongoose.model(
  'Obra',
  new Schema(
    {
      titulo: {
        type: String,
        required: [true, 'Informe o título da obra.'],
        trim: true,
        maxlength: [150, 'O título pode ter no máximo 150 caracteres.'],
      },
      descricao: { type: String, trim: true },
      endereco: { type: String, trim: true },
      dataInicioPrevista: { type: Date, required: [true, 'Informe a data de início prevista.'] },
      status: {
        type: String,
        enum: {
          values: STATUS_OBRA,
          message: `Status da obra inválido. Use: ${STATUS_OBRA.join(', ')}.`,
        },
        default: 'Planejada',
      },
      criadoPor: ref('Usuario'),
    },
    { timestamps: true }
  )
);

// A foto fica vinculada a uma única obra. Os arquivos de foto e os PDFs vivem em
// pastas separadas, então remover uma foto nunca toca nos documentos das requisições.
const Foto = mongoose.model(
  'Foto',
  new Schema({
    obra: { ...ref('Obra'), index: true },
    nomeArquivo: { type: String, required: true },
    nomeOriginal: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    tamanho: { type: Number, required: true },
    enviadoPor: ref('Usuario'),
    enviadoEm: { type: Date, default: Date.now },
  })
);

const itemSchema = new Schema(
  {
    descricao: {
      type: String,
      required: [true, 'Informe a descrição de cada material.'],
      trim: true,
    },
    quantidade: {
      type: Number,
      required: [true, 'Informe a quantidade de cada material.'],
      validate: { validator: (v) => v > 0, message: 'A quantidade deve ser maior que zero.' },
    },
    unidade: { type: String, trim: true },
    observacao: { type: String, trim: true },
  },
  { _id: false, id: false }
);

const historicoSchema = new Schema(
  {
    status: { type: String, required: true },
    descricao: { type: String },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    data: { type: Date, default: Date.now },
  },
  { _id: false, id: false }
);

const pdfSchema = new Schema(
  {
    versao: { type: Number, required: true },
    arquivo: { type: String, required: true },
    geradoEm: { type: Date, default: Date.now },
  },
  { _id: false, id: false }
);

const requisicaoSchema = new Schema(
  {
    numero: { type: Number, required: true, unique: true },
    obra: { ...ref('Obra'), index: true },
    solicitante: ref('Usuario'),
    data: { type: Date, required: [true, 'Informe a data da solicitação.'] },
    status: {
      type: String,
      enum: { values: STATUS_REQUISICAO, message: 'Status da solicitação inválido.' },
      default: 'Solicitada',
    },
    observacoes: { type: String, trim: true },
    itens: {
      type: [itemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A solicitação precisa ter ao menos um item.',
      },
    },
    historico: [historicoSchema],
    pdfs: [pdfSchema],
  },
  { timestamps: true }
);

requisicaoSchema.virtual('codigo').get(function () {
  return `REQ-${String(this.numero).padStart(4, '0')}`;
});

const Requisicao = mongoose.model('Requisicao', requisicaoSchema);

// Numeração sequencial das requisições (o banco em memória sempre começa vazio).
let contador = 0;
const proximoNumero = () => ++contador;

let servidor;

async function conectar() {
  servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri(), { dbName: 'gerenciador_obras' });
  // Garante que os índices únicos (e-mail, número da requisição) existam antes do uso.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function desconectar() {
  await mongoose.disconnect();
  if (servidor) await servidor.stop();
}

module.exports = {
  conectar,
  desconectar,
  proximoNumero,
  Usuario,
  Obra,
  Foto,
  Requisicao,
  STATUS_OBRA,
  STATUS_REQUISICAO,
};
