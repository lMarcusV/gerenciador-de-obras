const path = require('path');

const RAIZ = path.join(__dirname, '..');
const STORAGE_DIR = path.join(RAIZ, 'storage');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'segredo-de-desenvolvimento-troque-em-producao',
  PUBLIC_DIR: path.join(RAIZ, 'public'),
  SPEC_PATH: path.join(RAIZ, 'openapi.yaml'),
  STORAGE_DIR,
  FOTOS_DIR: path.join(STORAGE_DIR, 'fotos'),
  PDF_DIR: path.join(STORAGE_DIR, 'pdfs'),
};
