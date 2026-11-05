# Verificação — 05/11/2026

Ambiente: Linux; Node.js v24.22.1. Nenhuma dependência externa instalada.

```bash
npm test --prefix api-lab-2026-11-05
node api-lab-2026-11-05/examples/kanban-demo.mjs
```

Dentro do repositório: `npm test` e `node examples/kanban-demo.mjs`.

## Testes executados

12 testes, 12 aprovados, 0 falhas, 0 cancelados, 0 ignorados. Exit code 0. Duração do runner: 1686.695829 ms, variável por execução. O npm emitiu um aviso da configuração ambiental http-proxy; o projeto não adiciona essa configuração.

1. Criar vínculos, consultar quadro e editar cartão parcialmente.
2. Mover entre colunas, mantendo cartão único e posições contíguas.
3. Reordenar na mesma coluna; posição aplicada à lista final.
4. Rejeitar movimentos entre quadros e referências inexistentes.
5. Posições inválidas não alteram o quadro.
6. Exclusão bloqueada de pais ocupados; remoção de filhos e vínculos sem órfãos.
7. Validação de tipos, limites e campos desconhecidos/imutáveis.
8. JSON, Content-Type, corpo, query string, rota e métodos inválidos.
9. Dezesseis criações e movimentos concorrentes sem perda/duplicação de cartões.
10. Falha de disco simulada: movimento não altera arquivo nem memória.
11. Arquivo corrompido ou vínculo órfão impede inicialização sem sobrescrever.
12. Processo Node real: criação, edição, movimento, SIGTERM, novo processo e quadro idêntico após recarga.

## Demonstração executada

Exit code 0. A fazer: Escrever testes, posição 1. Concluído: Documentar rotas, posição 1. Excluir a coluna ocupada retornou 409 com error.code not_empty. O script faz asserções dos resultados e remove os dados temporários.

## Limites da evidência

HTTP real em portas locais efêmeras, arquivos temporários e reinício por SIGTERM. Não simula perda de energia, múltiplos processos ou edição distribuída. Não inclui teste de carga, execução em Windows, hospedagem ou integração Trello. Os limites máximos de capacidade estão implementados e documentados, mas não foram preenchidos até o teto nesta rodada.

Melhoria concreta: demo isolada com asserções de ordem/vínculos, guia de contribuição e formulário de bug com estado anterior, coluna e posição de destino.
