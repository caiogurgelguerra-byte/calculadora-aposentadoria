# Aposentadoria - Patrimonio Atual Livre

## Contexto

A calculadora de aposentadoria possui um campo publico de "Patrimonio atual investido" no formulario principal. O usuario avaliou que forcar multiplos de mil deixa a simulacao menos fidedigna, porque o patrimonio atual real pode ter qualquer valor em reais e centavos.

## Design

O campo continuara usando entrada textual, mas nao deve aplicar a mascara enquanto a pessoa digita. Durante a edicao, o texto digitado fica livre para evitar que a mascara reposicione ou reescreva o valor. O estado `patrimonioAtual` deve ser atualizado em tempo real com o numero correspondente. Ao sair do campo, o valor deve ser formatado em `pt-BR`.

Exemplos esperados:

- durante a digitacao, `1000` permanece `1000`;
- ao sair do campo, `1000` vira `1.000,00`;
- durante a digitacao, `12345,67` permanece `12345,67`;
- ao sair do campo, `12345,67` vira `12.345,67`;
- ao sair do campo, `155500` vira `155.500,00`;
- valores com centavos devem ser preservados nesse campo.

O campo de renda mensal desejada permanece inalterado e continua aceitando valores monetarios livres.

## Testes

O teste de `InputForm` deve cobrir a digitacao livre no campo de patrimonio atual, a formatacao no blur e o valor enviado em `onChange`. A suite focada de aposentadoria deve ser executada antes e depois da implementacao, seguindo TDD.
