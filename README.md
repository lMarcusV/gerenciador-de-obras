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

## Quais são as regras de negócio

### 1. Usuários e acesso

- Cada usuário tem uma conta identificável (nome, e-mail único e senha).
- Cada obra fica associada ao usuário que a cadastrou.
- O sistema registra qual usuário criou cada solicitação de material.
- Todos os usuários autenticados podem ver as obras cadastradas por outras pessoas.
- As fotos das obras estão disponíveis para consulta a todos os usuários.

### 2. Cadastro de obras

- A obra precisa de nome (título) e data de início prevista.
- Cada obra tem um identificador único e registra o usuário responsável pelo cadastro.
- Uma obra pode ter várias fotos.
- Cada foto pertence a uma única obra e registra a data em que foi adicionada.
- A obra tem um status: Planejada, Em andamento, Concluída ou Cancelada (padrão: Planejada).

### 3. Fotos e acompanhamento

- É possível adicionar várias fotos à obra durante a execução (até 10 por envio, de até 10 MB cada, nos formatos JPG, PNG, WEBP ou GIF).
- Cada foto permanece vinculada à obra em que foi registrada.
- O sistema guarda o nome do arquivo, a data de envio e o usuário que enviou.
- Fotos e PDFs ficam em pastas e coleções separadas. Remover uma foto nunca apaga nem altera os documentos das solicitações.

### 4. Solicitações de materiais

- Toda solicitação pertence a uma obra cadastrada, tem identificador único (e um código legível, como `REQ-0001`) e registra quem a criou.
- A solicitação tem data, itens e quantidades. Cada item informa a descrição e a quantidade (maior que zero); unidade de medida e observação são opcionais.
- Não é possível criar solicitação sem obra, sem responsável ou sem itens.
- O status pode ser Rascunho, Solicitada, Aprovada, Rejeitada ou Atendida. Toda requisição criada pela aplicação nasce como **Solicitada**.
- Cada solicitação mantém um histórico (`historico`) com as mudanças de status, quem as fez e quando.

### 5. Documento PDF

- Ao registrar a solicitação, o sistema gera um PDF com o código da solicitação, a obra, a data, o solicitante, o status, os materiais e as quantidades.
- O PDF fica vinculado à solicitação e pode ser baixado a partir da obra.
- Os PDFs são guardados por versão (`pdfs`), o que permite gerar uma nova versão sem perder as anteriores.
- Se a geração ou o armazenamento do PDF falhar, a solicitação **não é registrada**, e a API responde com erro explicando o motivo.

### 6. Consulta e histórico

- Os usuários consultam as solicitações de cada obra, com quem as fez e quando foram criadas.
- É possível ver os itens, o status e o PDF de cada solicitação.
- O vínculo entre obra, solicitação, solicitante e documento é sempre preservado.
- Obras canceladas e suas solicitações continuam disponíveis para consulta. Em obras canceladas não é possível adicionar fotos nem criar novas requisições.

### Escopo desta versão

Como a aplicação tem apenas as seis funcionalidades acima, ela não oferece telas ou rotas para editar obras ou mudar o status de uma requisição. O modelo de dados (status, histórico e versões de PDF) já está preparado para essas evoluções.

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
