# Como contribuir

Use Node.js 22+ e rode `npm test`. Para explorar sem alterar seu arquivo de dados: `node examples/kanban-demo.mjs`.

Ao abrir uma issue, descreva comandos, resposta esperada/observada, ordem anterior dos cartões e coluna/posição desejada. Use IDs e títulos fictícios. Informe a versão do Node e se houve reinício.

Faça uma mudança pequena por pull request e acrescente um teste HTTP para comportamento novo. Em movimentos, confira tanto origem quanto destino, posição e ausência de cartões duplicados. Para exclusão, confira que nenhum vínculo órfão permanece. Atualize o README se alterar limites ou contratos.

Não versione data/, .env, logs, dados pessoais ou credenciais. Os testes devem continuar isolados de serviços externos. Apoiar por Pix é opcional e não é condição para usar ou contribuir.

Licença MIT.
