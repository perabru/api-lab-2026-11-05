# LinkedIn — Board Lane API

- Data da entrega: 05/11/2026 (America/Sao_Paulo).
- Perfil autorizado: https://www.linkedin.com/in/brunopera00/
- Estado: pendente de publicação; publicar somente após confirmar código no GitHub e ausência de duplicata.
- Idiomas: português e inglês, em um único post.

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
