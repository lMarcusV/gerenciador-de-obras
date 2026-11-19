# Critérios de aceitação — testes de API e Web

Este documento serve como roteiro manual para validar os fluxos existentes do Gerenciador de Obras. Execute os cenários com a aplicação iniciada (`npm start`) e registre cada resultado como **Passou**, **Falhou** ou **Bloqueado**.

## Preparação

1. Inicie a aplicação e acesse `http://localhost:3000`.
2. Para chamadas de API, use `http://localhost:3000/api` e obtenha um token em `POST /auth/login`.
3. Use uma das contas de demonstração: `carlos@obras.com`, `ana@obras.com` ou `roberto@obras.com`; senha `senha123`.
4. Envie `Authorization: Bearer <token>` nas rotas protegidas. Os dados de demonstração são recriados ao reiniciar a aplicação.
5. Para cenários de upload, tenha imagens JPG/PNG/WEBP/GIF, uma imagem acima de 10 MB e um arquivo que não seja imagem.

## Critérios da API

| ID | Cenário | Critério de aceitação |
| --- | --- | --- |
| API-01 | Login válido | `POST /auth/login` com credenciais corretas responde `200`, retorna token e dados do usuário sem expor o hash da senha. |
| API-02 | Login inválido | Credenciais incorretas respondem `401` com mensagem de erro; nenhum token é emitido. |
| API-03 | Cadastro válido | `POST /auth/cadastro` com nome, e-mail válido e senha com pelo menos seis caracteres responde `201` e retorna token e usuário. |
| API-04 | Cadastro inválido ou duplicado | Dados obrigatórios inválidos respondem `400`; e-mail já cadastrado responde `409`. |
| API-05 | Autenticação obrigatória | Uma rota protegida sem token ou com token inválido responde `401`. |
| API-06 | Listar e consultar obras | `GET /obras` retorna as obras; `GET /obras/{obraId}` retorna a obra solicitada, incluindo responsável e totais de fotos e requisições. Identificador inexistente responde `404`. |
| API-07 | Filtrar obras | `GET /obras?status=Planejada` retorna somente obras com esse status. |
| API-08 | Criar obra | `POST /obras` com título e data válidos responde `201`, associa a obra ao usuário autenticado e usa `Planejada` quando status não é enviado. |
| API-09 | Validar criação de obra | Título ausente, data inválida ou status fora de `Planejada`, `Em andamento`, `Concluída` e `Cancelada` responde `400`. |
| API-10 | Atualizar parcialmente uma obra | `PATCH /obras/{obraId}` altera somente os campos enviados e preserva os demais. Por exemplo, `{ "status": "Em andamento" }` altera apenas o status. |
| API-11 | Substituir dados de uma obra | `PUT /obras/{obraId}` exige `titulo`, `descricao`, `endereco`, `dataInicioPrevista` e `status`; responde `200` com os dados atualizados. Campos opcionais podem ser strings vazias. |
| API-12 | Validar PUT/PATCH de obra | PATCH vazio, campo não editável, título inválido, data inválida, status inválido ou PUT incompleto responde `400`; obra inexistente responde `404`. |
| API-13 | Transições de status da obra | PATCH permite definir cada status válido, inclusive Cancelada e, depois, outro status para reativá-la. A obra atualizada reflete o novo status em consultas e listagens filtradas. |
| API-14 | Listar fotos | `GET /obras/{obraId}/fotos` requer autenticação e retorna somente fotos associadas à obra. |
| API-15 | Enviar fotos válidas | `POST /obras/{obraId}/fotos` aceita até 10 imagens JPG/PNG/WEBP/GIF de até 10 MB cada, associa cada foto à obra e ao usuário autenticado, e responde `201`. |
| API-16 | Rejeitar upload inválido | Arquivo não permitido, arquivo acima de 10 MB, mais de 10 arquivos ou ausência de arquivo responde `400`. |
| API-17 | Excluir foto | `DELETE /obras/{obraId}/fotos/{fotoId}` remove a foto da listagem e responde `204`; foto inexistente ou de outra obra responde `404`. |
| API-18 | Restrições de obra cancelada | Fotos não podem ser adicionadas/removidas e novas requisições não podem ser criadas enquanto a obra estiver Cancelada; a API responde `409`. Consultas continuam disponíveis. |
| API-19 | Criar requisição | `POST /obras/{obraId}/requisicoes` com pelo menos um item válido responde `201`, atribui código sequencial, solicitante autenticado e status inicial `Solicitada`, e retorna URL do PDF. |
| API-20 | Validar requisição | Sem itens, descrição vazia, quantidade menor ou igual a zero ou data inválida responde `400`. |
| API-21 | Consultar requisições | `GET /obras/{obraId}/requisicoes` lista as requisições da obra; `GET /requisicoes/{requisicaoId}` retorna obra, solicitante, itens, status, histórico e versões de PDF. |
| API-22 | Baixar PDF | `GET /requisicoes/{requisicaoId}/pdf` com token válido retorna um PDF legível; versão inexistente ou arquivo ausente responde `404`. |
| API-23 | Documentação | `/api-docs` abre o Swagger UI e `/openapi.yaml` retorna a especificação atual, incluindo PUT e PATCH de obra. |

## Critérios da aplicação Web

| ID | Cenário | Critério de aceitação |
| --- | --- | --- |
| WEB-01 | Login | A tela permite entrar com uma conta válida, mostra erros para credenciais inválidas e leva o usuário autenticado à lista de obras. |
| WEB-02 | Sessão | Após atualizar a página no mesmo navegador, a sessão permanece utilizável; sair encerra a sessão e retorna à tela de login. |
| WEB-03 | Lista de obras | A lista exibe título, status, responsável e contagens; o filtro por status atualiza os resultados e cada obra abre sua página de detalhes. |
| WEB-04 | Criar obra | O formulário cria uma obra com título e data válidos; os campos inválidos apresentam erro compreensível e a obra criada aparece na lista. |
| WEB-05 | Alterar status | Na página da obra, o seletor permite escolher Planejada, Em andamento, Concluída ou Cancelada. Ao confirmar, a tela mostra o status atualizado. |
| WEB-06 | Reativar obra | Em obra Cancelada, mudar o seletor para outro status reativa a obra e libera as ações de adicionar fotos e criar requisições. |
| WEB-07 | Obra cancelada | Enquanto cancelada, a interface informa que a obra é somente para consulta e não oferece ações de upload ou nova requisição. |
| WEB-08 | Fotos | A tela lista as fotos da obra, permite ampliar/visualizar e enviar imagens aceitas; após envio, a galeria é atualizada. A exclusão remove a foto da tela. |
| WEB-09 | Nova requisição | O formulário permite informar data, observações e um ou mais materiais; após salvar, abre a página da requisição e exibe seu código e status. |
| WEB-10 | Detalhes da requisição | A tela apresenta obra, solicitante, itens, quantidades, status e histórico, e permite baixar o PDF. |
| WEB-11 | Erros e carregamento | Falhas da API são apresentadas ao usuário; indicadores de carregamento são substituídos pelo conteúdo ou mensagem de erro/estado vazio correspondente. |
| WEB-12 | Navegação | Links de voltar, navegação entre lista, obra e requisição, e botão de sair levam ao destino esperado sem tela quebrada. |

## Registro dos resultados

Use esta tabela durante a execução e inclua observações ou passos para reproduzir cada falha.

| ID | Resultado | Observações / evidência |
| --- | --- | --- |
|  |  |  |

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