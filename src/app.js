const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const routes = require('./routes');
const { PUBLIC_DIR, SPEC_PATH, FOTOS_DIR } = require('./config');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// Especificação OpenAPI: arquivo YAML puro e a interface Swagger UI.
app.get('/openapi.yaml', (req, res) => {
  res.type('text/plain; charset=utf-8').send(fs.readFileSync(SPEC_PATH, 'utf8'));
});
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8')), {
    customSiteTitle: 'Gerenciador de Obras - API',
  })
);

// API
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));

// Fotos (consulta liberada a todos) e site
app.use('/storage/fotos', express.static(FOTOS_DIR));
app.use(express.static(PUBLIC_DIR));

// Tratamento de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    const mensagens = [...new Set(Object.values(err.errors).map((e) => e.message))];
    return res.status(400).json({ mensagem: mensagens.join(' ') });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ mensagem: `Valor inválido para o campo "${err.path}".` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ mensagem: 'Registro duplicado.' });
  }
  if (err instanceof multer.MulterError) {
    const mensagens = {
      LIMIT_FILE_SIZE: 'Cada foto pode ter no máximo 10 MB.',
      LIMIT_FILE_COUNT: 'Envie no máximo 10 fotos por vez.',
      LIMIT_UNEXPECTED_FILE: 'Envie as fotos no campo "fotos" (máximo de 10 por vez).',
    };
    return res.status(400).json({ mensagem: mensagens[err.code] || 'Falha no envio das fotos.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'O corpo da requisição não é um JSON válido.' });
  }
  if (err.status) return res.status(err.status).json({ mensagem: err.message });

  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

module.exports = app;
