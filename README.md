# Gerenciador de Obras

## O que é esta aplicação

O Gerenciador de Obras é uma API REST com um site (ambos em JavaScript) para acompanhar obras de construção.

Cada usuário tem uma conta e pode cadastrar obras que vão iniciar. Dentro da obra, qualquer usuário pode adicionar fotos para mostrar o andamento. Durante a execução, os usuários criam requisições de material. Cada requisição gera um PDF, que fica anexado à obra. Também é possível consultar as requisições de cada obra e ver quem as solicitou.

A aplicação tem seis funcionalidades:

1. Login
2. Cadastro de usuário
3. Cadastro de obra
4. Inserir fotos de obra
5. Criar requisição de material
6. Verificar requisição de material

Tecnologias: Node.js, Express, MongoDB em memória (`mongodb-memory-server` com Mongoose), JWT para autenticação, Multer para upload de fotos, PDFKit para os PDFs e Swagger UI para a documentação.

## Como instalar

Requisitos: Node.js 18 ou superior e acesso à internet na primeira execução.

```bash
npm install
```

## Como executar

```bash
npm start
```

Para reiniciar automaticamente ao editar o código: `npm run dev`.

Para usar outra porta: `PORT=4000 npm start` (no Windows PowerShell: `$env:PORT=4000; npm start`).

Observações importantes:

- Na **primeira execução**, o `mongodb-memory-server` baixa o binário do MongoDB (cerca de 100 a 200 MB). Isso pode levar alguns minutos, e as execuções seguintes são rápidas.
- O banco é **em memória**: todos os dados são perdidos ao parar a aplicação e recriados com os dados de teste na próxima inicialização. As fotos e os PDFs ficam na pasta `storage/`, que também é limpa a cada início para ficar consistente com o banco.
- Opcionalmente, defina `JWT_SECRET` para trocar o segredo usado nos tokens.

## Quais dados de teste estão incluídos

Ao iniciar, a aplicação carrega automaticamente:

**3 usuários** (senha de todos: `senha123`)

| Nome | E-mail |
| --- | --- |
| Carlos Mendes | carlos@obras.com |
| Ana Souza | ana@obras.com |
| Roberto Lima | roberto@obras.com |

**3 obras**

| Obra | Status | Cadastrada por |
| --- | --- | --- |
| Edifício Residencial Aurora | Em andamento | Carlos |
| Reforma da Escola Municipal Rio Negro | Planejada | Ana |
| Galpão Logístico Distrito | Concluída | Roberto |

**3 fotos** de exemplo (imagens SVG geradas na inicialização), duas na obra Aurora e uma no Galpão.

**3 requisições de material**, cada uma com PDF gerado: duas na obra Aurora (feitas por Carlos e por Ana) e uma no Galpão (feita por Roberto).


### Escopo desta versão

Obras podem ser editadas pela API com `PUT /api/obras/{obraId}` (substituição dos campos editáveis) ou `PATCH /api/obras/{obraId}` (alteração parcial). Na interface, a página da obra permite alterar seu status. O status de requisições ainda não possui fluxo de edição.

Para executar os testes manuais da API e da interface, consulte [CRITERIOS_ACEITACAO.md](CRITERIOS_ACEITACAO.md).

## Quais são as URLs importantes para acessar a aplicação

Com a aplicação rodando na porta padrão:

| O que | URL |
| --- | --- |
| Site | http://localhost:3000 |
| Login | http://localhost:3000/#/login |
| Cadastro | http://localhost:3000/#/cadastro |
| Documentação interativa (Swagger UI) | http://localhost:3000/api-docs |
| Especificação da API em YAML | http://localhost:3000/openapi.yaml |
| Base da API REST | http://localhost:3000/api |

### Endpoints da API

Todas as rotas, exceto login e cadastro, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Função |
| --- | --- | --- |
| POST | `/api/auth/cadastro` | Cadastrar usuário |
| POST | `/api/auth/login` | Login (devolve o token) |
| GET | `/api/obras` | Listar obras (filtro opcional `?status=`) |
| POST | `/api/obras` | Cadastrar obra |
| GET | `/api/obras/:obraId` | Consultar obra |
| GET | `/api/obras/:obraId/fotos` | Listar fotos da obra |
| POST | `/api/obras/:obraId/fotos` | Inserir fotos (multipart, campo `fotos`) |
| DELETE | `/api/obras/:obraId/fotos/:fotoId` | Excluir foto e arquivo associado (obras canceladas não permitem alterações) |
| GET | `/api/obras/:obraId/requisicoes` | Listar requisições da obra |
| POST | `/api/obras/:obraId/requisicoes` | Criar requisição e gerar o PDF |
| GET | `/api/requisicoes/:requisicaoId` | Verificar requisição |
| GET | `/api/requisicoes/:requisicaoId/pdf` | Baixar o PDF (`?versao=` opcional) |

### Exemplo rápido com curl

```bash
# 1. Login
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos@obras.com","senha":"senha123"}'

# 2. Listar obras (troque SEU_TOKEN pelo token recebido)
curl -s http://localhost:3000/api/obras -H "Authorization: Bearer SEU_TOKEN"
```

## Estrutura do projeto

```
openapi.yaml        Especificação da API (Swagger/OpenAPI)
src/server.js       Inicialização (banco em memória, dados de teste, servidor)
src/app.js          Express: Swagger, API, site e tratamento de erros
src/routes.js       Rotas da API
src/db.js           Banco em memória e modelos
src/requisicoes.js  Criação da requisição + PDF
src/pdf.js          Geração do PDF
src/seed.js         Dados de teste
public/             Site (HTML, CSS e JavaScript)
storage/            Fotos e PDFs da execução atual (criada ao iniciar)
```
