# Aposentadoria - Campos Monetarios Livres

## Contexto

A calculadora de aposentadoria possui campos monetarios publicos no formulario principal. O usuario avaliou que forcar multiplos ou formatar durante a digitacao deixa a simulacao menos fidedigna e dificulta informar valores reais.

## Design

Os campos `rendaMensal` e `patrimonioAtual` continuarao usando entrada textual, mas nao devem aplicar mascara enquanto a pessoa digita. Durante a edicao, o texto digitado fica livre para evitar que a mascara reposicione ou reescreva o valor. Os estados numericos devem ser atualizados em tempo real com o numero correspondente. Ao sair do campo, o valor deve ser formatado em `pt-BR`.

Exemplos esperados:

- durante a digitacao, `1000` permanece `1000`;
- ao sair do campo, `1000` vira `1.000,00`;
- durante a digitacao, `12345,67` permanece `12345,67`;
- ao sair do campo, `12345,67` vira `12.345,67`;
- ao sair do campo, `155500` vira `155.500,00`;
- valores com centavos devem ser preservados nesse campo.

## Testes

O teste de `InputForm` deve cobrir a digitacao livre nos campos de renda mensal e patrimonio atual, a formatacao no blur e o valor enviado em `onChange`. A suite focada de aposentadoria deve ser executada antes e depois da implementacao, seguindo TDD.
