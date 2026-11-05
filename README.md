![Board Lane API — cada cartão em seu lugar](brand/banner.svg)

# Board Lane API · Kanban local

Organize tarefas de uma aula, projeto ou laboratório em quadros, colunas e cartões. Mova um cartão para outra etapa ou reorganize a própria coluna, mantendo a ordem e os vínculos entre os recursos.

**Dia 03/10 · 05/11/2026 · Node.js 22+ · zero dependências externas · 12 testes aprovados**

[Começar](#comece-aqui) · [Rotas](#contrato-http) · [Movimentação](#mova-sem-perder-a-ordem) · [Verificação](VERIFICATION.md) · [Anúncio](ANNOUNCEMENT.md) · [Texto do LinkedIn](LINKEDIN.md) · [Contribuir](CONTRIBUTING.md)

Implementação própria inspirada nos recursos de quadros, listas e cartões da API REST do Trello. Não acessa conta Trello, não sincroniza serviços e não exige token. O código está publicado para execução local; não há endpoint público hospedado nem interface gráfica nesta entrega.

## Comece aqui

Requisito: Node.js 22 ou superior. Verificado com **v24.22.1**. Sem `npm install`.

```bash
git clone https://github.com/perabru/api-lab-2026-11-05.git
cd api-lab-2026-11-05
npm start
```

Em outro terminal Bash, WSL ou Git Bash:

```bash
curl -i http://127.0.0.1:3000/health
curl -i -X POST http://127.0.0.1:3000/boards \
  -H 'Content-Type: application/json' -d '{"name":"Aula de APIs"}'
```

O quadro retorna 201, um `id` UUID e `name`. `Location` aponta para `/boards/<id>`. Copie os IDs reais retornados e substitua os marcadores dos exemplos:

```bash
curl -X POST http://127.0.0.1:3000/boards/ID-DO-QUADRO/columns \
  -H 'Content-Type: application/json' -d '{"name":"A fazer"}'
curl -X POST http://127.0.0.1:3000/boards/ID-DO-QUADRO/columns \
  -H 'Content-Type: application/json' -d '{"name":"Concluído"}'
curl -X POST http://127.0.0.1:3000/columns/ID-DA-COLUNA/cards \
  -H 'Content-Type: application/json' -d '{"title":"Documentar rotas","description":"Escrever os exemplos"}'
curl http://127.0.0.1:3000/boards/ID-DO-QUADRO
```

Os marcadores não são IDs válidos; não os envie literalmente. Para um fluxo completo automático, sem copiar IDs nem alterar seus dados, rode **`node examples/kanban-demo.mjs`**.

## Contrato HTTP

| Método | Rota | Resultado |
|---|---|---|
| GET | `/health` | 200, `{"status":"ok"}` |
| POST | `/boards` | 201, quadro `{id,name}` + Location |
| GET | `/boards` | 200, `{items,total}` com resumos dos quadros |
| GET | `/boards/:id` | 200, quadro completo com colunas e cartões ordenados |
| DELETE | `/boards/:id` | 204 somente se o quadro não tiver colunas |
| POST | `/boards/:id/columns` | 201, coluna vazia vinculada ao quadro |
| DELETE | `/columns/:id` | 204 somente se a coluna não tiver cartões |
| POST | `/columns/:id/cards` | 201, cartão no final da coluna + Location |
| GET | `/cards/:id` | 200, cartão com posição atual |
| PATCH | `/cards/:id` | 200, altera título/descrição |
| DELETE | `/cards/:id` | 204, exclui cartão e seu vínculo |
| POST | `/cards/:id/move` | 200, move/reordena e retorna posição final |

Quadros e colunas são listados por criação. Cartões são listados pela ordem da coluna. GET do quadro inclui `columns: [{id, board_id, name, cards: [...]}]`. Cada cartão contém `id`, `column_id`, `title`, `description` e `position` derivada da ordem atual. IDs e vínculos não podem ser editados por PATCH. Não há renomeação de quadros/colunas nesta versão.

## Mova sem perder a ordem

```bash
curl -X POST http://127.0.0.1:3000/cards/ID-DO-CARTAO/move \
  -H 'Content-Type: application/json' \
  -d '{"column_id":"ID-DA-COLUNA-DESTINO","position":1}'
```

- `column_id` é obrigatório e deve existir.
- A coluna de destino precisa pertencer ao **mesmo quadro**. Movimento entre quadros retorna 409.
- `position` é inteira e começa em **1**; omitida, envia para o final.
- A posição é avaliada **depois de remover o cartão da origem**. Na mesma coluna com três cartões, mover o primeiro para posição 3 o coloca por último.
- A posição máxima é o tamanho do destino, após a remoção, mais 1. Posição inválida retorna 422 e mantém o quadro intacto.
- Mover ou excluir um cartão recalcula as posições contíguas dos restantes.

O vínculo e a ordem são gravados juntos. Exclusões de pais ocupados retornam 409: mova ou remova os cartões antes de excluir a coluna; exclua as colunas antes do quadro. Não há exclusão em cascata.

```bash
curl -X PATCH http://127.0.0.1:3000/cards/ID-DO-CARTAO \
  -H 'Content-Type: application/json' -d '{"description":"Exemplos revisados"}'
curl -i -X DELETE http://127.0.0.1:3000/cards/ID-DO-CARTAO
```

## Validação e erros

| Entrada | Regra |
|---|---|
| `name` | Quadro/coluna: texto não vazio, até 80 caracteres |
| `title` | Cartão: texto não vazio, até 140 caracteres |
| `description` | Texto até 2000 caracteres; padrão vazio |
| `column_id` | Somente no movimento; string com ID existente |
| `position` | Inteiro positivo dentro da lista final |

Textos são aparados nas extremidades e não aceitam caracteres de controle. Campos desconhecidos, objetos vazios, arrays no lugar de objetos e edição de vínculos por PATCH são rejeitados. Nomes/títulos repetidos são permitidos; identificadores diferenciam os recursos.

```json
{"error":{"code":"not_empty","message":"Remova ou mova os cartões antes de excluir a coluna."}}
```

| Status | Situação |
|---|---|
| 400 | JSON inválido ou query string (não há filtros/paginação nesta versão) |
| 404 | Rota ou recurso ausente |
| 405 | Método não permitido, com cabeçalho Allow |
| 409 | Pai ocupado, movimento entre quadros ou capacidade atingida |
| 413 | Corpo maior que 16 KiB |
| 415 | POST/PATCH sem Content-Type application/json |
| 422 | Campo, tipo ou posição inválidos |
| 503 | Falha de persistência; alteração não aplicada em memória |

## Persistência e limites

Padrão: `data/kanban.json`, ignorado pelo Git. Cada mutação clona o estado, grava arquivo temporário e faz rename antes de atualizar a memória. Arquivo corrompido, cartão órfão ou vínculo duplicado impedem inicialização, preservando os dados para recuperação manual.

```bash
PORT=3100 DATA_FILE=./data/projeto.json npm start
```

`HOST=127.0.0.1` e `PORT=3000` são os padrões. Limites por arquivo: **100 quadros, 1000 colunas e 5000 cartões**. Todo o estado fica em memória e é regravado a cada alteração; indicado para estudo e pequenos conjuntos locais.

Use um único processo por arquivo. Não há lock entre processos, autenticação, autorização, controle de versão por cliente, colaboração em tempo real ou garantia contra perda de energia. Requisições concorrentes no mesmo processo são aplicadas em sequência; duas edições válidas do mesmo campo seguem a ordem de processamento, sem detecção de edição obsoleta. POST de criação não é idempotente: repetir cria outro recurso. Faça backup com o servidor parado. Não exponha diretamente à internet nem armazene dados sensíveis sem adaptar segurança e armazenamento.

## Experimente com dados isolados

```bash
npm test
node examples/kanban-demo.mjs
```

**Resultado em 05/11/2026: 12 testes aprovados, 0 falhas.** [Comandos, resultados e alcance](VERIFICATION.md).

A demo cria um quadro com duas colunas, adiciona cartões, move um deles e verifica automaticamente esta projeção da resposta:

```json
[
  {"name":"A fazer","cards":[{"title":"Escrever testes","position":1}]},
  {"name":"Concluído","cards":[{"title":"Documentar rotas","position":1}]}
]
```

Tentar excluir a coluna ocupada retorna 409/not_empty. Os dados temporários são removidos ao finalizar; seu arquivo habitual não é alterado.

## Referências oficiais consultadas em 05/11/2026

- [Trello REST API — Cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/): inspiração para criar, consultar e atualizar cartões vinculados a listas.
- [Trello REST API — Lists](https://developer.atlassian.com/cloud/trello/rest/api-group-lists/): referência para listas vinculadas a quadros e ordenação.

A implementação usa `columns` e posições inteiras contíguas, com contrato próprio. Não implementa toda a API do Trello, não utiliza sua marca no produto e não é afiliada à Atlassian.

## 💛 Incentive mais código aberto

![Apoio voluntário por Pix](https://raw.githubusercontent.com/perabru/peradev-apis/main/brand/pix-support.svg)

Se este exemplo ajudou você a organizar um projeto ou entender APIs, uma colaboração voluntária incentiva a continuidade e a criação de novas APIs.

### Chave Pix — copie e cole

```text
bruno.pera@unifesp.br
```

**O apoio é opcional. O código permanece aberto e gratuito para todos.**

Obrigado por incentivar exemplos reproduzíveis, testes e documentação acessível.

## Participe

[Guia de contribuição](CONTRIBUTING.md) · [Relatar falha](https://github.com/perabru/api-lab-2026-11-05/issues/new?template=bug_report.yml)

A melhoria de contribuição desta entrega é uma demo que confere ordem e vínculos sem tocar em seus dados, junto de um formulário de bug que solicita a ordem anterior e a posição desejada.

**English:** A local Node.js Kanban API with boards, columns, editable cards, same-board moves, contiguous ordering and JSON persistence. Twelve HTTP tests passed, including concurrent moves, storage failure and real process restart. No external dependencies, Trello account integration or hosted endpoint.

[Calendário das 10 APIs](https://github.com/perabru/peradev-apis/blob/main/docs/10-days.md) · **Licença MIT — Bruno Michel Pera**
