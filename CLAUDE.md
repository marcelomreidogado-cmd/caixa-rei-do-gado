# Caixa Rei do Gado — guia do projeto

Caixa diário e controle de PIX das lojas do açougue Rei do Gado (Bingen, Corrêas, Coronel), mais a ferramenta **Cesta** (CRM de produtos por cliente).

## Publicação
- GitHub Pages da branch `main` (https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/). Push na `main` publica sozinho.

## Arquivos
- `index.html` — Caixa (~80 KB). Abas: Caixa Diário, PIX Loja, PIX Restaurante (`switchTab`). Login com Firebase Auth (e-mail/senha).
- `importar.html` — importação única dos dados de 2026.
- `cesta/index.html` — Cesta de Produtos por Cliente (**produção**, ~2,9 MB porque pdf.js 3.11 e SheetJS 0.18.5 vão embutidos). Ver `cesta/README.md`.
- `cesta-teste/index.html` — cópia de **teste** da cesta. Toda mudança na cesta entra primeiro aqui (commits "Teste: …") e só depois é promovida para `cesta/` (commit "Produção: …").

## Arquitetura
- Sem build. Firebase compat 10.12.5 (auth + **Realtime Database**), Chart.js 4.4.0.
- Firebase projeto `motoboy-ddefa` (o mesmo do RH e do Compras). Caixa grava em `caixa/…`; a cesta grava em `cesta_rei_do_gado/…` via REST (sem SDK).
- A cesta publica para o CRM: `cesta_rei_do_gado/crm/{CODIGO}`, `crm_tel/{NUMERO}`, `crm_meta`. Não mudar esses caminhos sem avisar.
- Arquivos da cesta são enormes: editar com buscas pontuais, nunca ler o arquivo inteiro.

## Fluxo de trabalho
- Editar → `node --check` no script extraído → testar em `cesta-teste/` → promover → commit em português.
- Nunca apagar dados do Realtime Database sem backup. Não mexer em regras de segurança/login sem perguntar.
- Usuário (Marcelo) trabalha em português do Brasil, no Mac, e prefere soluções simples, sem terminal.
