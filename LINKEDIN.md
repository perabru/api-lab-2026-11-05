# LinkedIn — Board Lane API

- Data da entrega e publicação: 05/11/2026 (America/Sao_Paulo).
- Perfil: https://www.linkedin.com/in/brunopera00/
- Estado: publicado; autorização diária de 04/11/2026, válida até 12/11/2026.
- Publicação: https://www.linkedin.com/feed/update/urn:li:activity:7524049095754428417/
- Verificação: 2026-11-05T10:05:21Z; mensagem “Publicação concluída.” e conteúdo português/inglês visível no permalink, incluindo o link deste repositório.
- Prevenção de duplicatas: manifesto e LINKEDIN.md estavam sem post do dia; atividades recentes mostravam Order Once (04/11), Project Shelf (03/11) e Task API (02/11), sem Board Lane. Publicar foi acionado uma única vez.
- Código confirmado antes do envio: https://github.com/perabru/api-lab-2026-11-05/commit/423a0c387c133c7454b5dbacd65869e106876cb5
- Idiomas: português e inglês no mesmo post; 1808 caracteres no texto de origem.

## Texto do post

🇧🇷 Mover um cartão parece simples — até ele ficar duplicado ou perder a posição.

No dia 3 do desafio “10 APIs em 10 dias”, publiquei a Board Lane API: um Kanban local com quadros, colunas e cartões.

Ela permite editar cartões, mover entre colunas do mesmo quadro e reordenar a lista. Valida os vínculos, bloqueia exclusões de colunas ocupadas e persiste os dados em JSON.

Aprendizado: a posição de destino precisa ser definida sobre a lista final, depois de remover o cartão da origem. Uma regra pequena que evita movimentos ambíguos.

12 testes HTTP passaram, incluindo concorrência, falha de gravação e reinício real do processo. Node.js, sem dependências externas. A documentação do Trello foi a referência de estudo; a implementação é própria, sem integração com contas Trello ou endpoint hospedado.

🇬🇧 Moving a card sounds simple — until it appears twice or loses its position.

For day 3 of “10 APIs in 10 days”, I built Board Lane API: a local Kanban API with boards, columns and cards.

It supports card edits, moves within a board, reordering, relationship validation and JSON persistence. Occupied columns cannot be deleted.

My takeaway: define the destination position in the final list, after removing the card from its source.

All 12 HTTP tests passed, covering concurrent requests, write failures and a real process restart. Built with Node.js and no external dependencies. Inspired by Trello’s official docs; this is an independent local implementation, without Trello account integration or a hosted endpoint.

Código, exemplos e testes / Code, examples and tests:
https://github.com/perabru/api-lab-2026-11-05

Como você definiria as regras de movimentação? Feedback é bem-vindo!
How would you design the move rules? Feedback welcome!

#API #NodeJS #OpenSource #SoftwareEngineering
