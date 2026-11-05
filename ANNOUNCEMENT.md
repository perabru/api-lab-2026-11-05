# Cada cartão em seu lugar

**Board Lane API · 05/11/2026 · Dia 03/10**

Crie um Kanban local para acompanhar tarefas de uma aula ou projeto. A API organiza quadros, colunas e cartões, permite editar título/descrição e mover cartões para outra etapa ou outra posição da mesma coluna.

A proposta de estudo é manter os vínculos consistentes: bloquear movimentos entre quadros, recalcular posições e impedir exclusões de pais ocupados. As alterações são persistidas em JSON.

**Node.js core · zero dependências externas · 12 testes HTTP aprovados**

```bash
git clone https://github.com/perabru/api-lab-2026-11-05.git
cd api-lab-2026-11-05
node examples/kanban-demo.mjs
npm test
npm start
```

A demo cria dados temporários, move um cartão e verifica a ordem resultante. Os testes incluem concorrência, falha de disco e reinício de processo real.

[README e contrato](README.md) · [Código](src/app.js) · [Verificação](VERIFICATION.md) · [Contribuir](CONTRIBUTING.md) · [Texto bilíngue do LinkedIn](LINKEDIN.md)

Referência: documentação oficial [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/), consultada em 05/11/2026. Implementação própria, com contrato local e sem afiliação, sincronização ou acesso a uma conta Trello. Código disponível para execução local, sem endpoint hospedado.

Teste com dados fictícios, sugira um caso de borda por issue ou dê uma estrela para acompanhar. O README tem apoio voluntário por Pix; o código continua aberto e gratuito.

**English summary:** Local Kanban API with boards, columns, card editing, same-board moves and contiguous ordering. Twelve HTTP tests passed, covering invalid references, concurrent moves, persistence failure and process restart. Try the isolated demo and contribute a reproducible edge case.

[Post bilíngue publicado e verificado no LinkedIn em 05/11/2026](https://www.linkedin.com/feed/update/urn:li:activity:7524049095754428417/).
