const fs = require('fs');
const config = require('./config');
const { conectar, desconectar } = require('./db');
const app = require('./app');
const seed = require('./seed');

async function iniciar() {
  // O banco é em memória: ao iniciar, as fotos e PDFs da execução anterior são descartados.
  fs.rmSync(config.STORAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(config.FOTOS_DIR, { recursive: true });
  fs.mkdirSync(config.PDF_DIR, { recursive: true });

  console.log('Iniciando o banco em memória (na primeira execução o MongoDB é baixado e pode demorar)...');
  await conectar();
  await seed();

  app.listen(config.PORT, () => {
    const base = `http://localhost:${config.PORT}`;
    console.log('\nGerenciador de Obras no ar');
    console.log(`  Site:         ${base}`);
    console.log(`  API:          ${base}/api`);
    console.log(`  Swagger UI:   ${base}/api-docs`);
    console.log(`  YAML (spec):  ${base}/openapi.yaml\n`);
  });
}

const encerrar = async () => {
  await desconectar();
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

iniciar().catch((e) => {
  console.error('Falha ao iniciar a aplicação:', e);
  process.exit(1);
});
