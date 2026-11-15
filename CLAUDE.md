# Caixa Rei do Gado — guia do projeto

Caixa diário e controle de PIX das lojas do açougue Rei do Gado (Bingen, Corrêas, Coronel), mais a **Cesta**, que é o CRM principal do Rei do Gado (clientes, mensagens pela Uazapi, campanhas, promoções e kits). O CRM antigo, feito no ChatGPT, foi desligado.

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
- A cesta **não publica mais nada para o CRM antigo** (desde a v4, de 14/11/2026). Os nós `crm`, `crm_tel`, `crm_meta` e `crm_hash` são legado: o botão "Desligar o CRM antigo de vez" (Ajustes) os arquiva em `arquivo_crm_antigo/AAAA-MM-DD` e só depois os apaga.
- Nós da cesta: `imports_meta`, `imports_linhas`, `imports_cli`, `vinculos`, `config` (inclui `regrasContato`, `metaDiaria`, `metaCadastro` e `mesclas`), `contatos`, `contatos_ult`, `hist`, `seg`, `camp`, `lemb`, `kit_img`, `computadores`, `rev`. O teste usa `cesta_rei_do_gado/teste/…`.
- Única fonte de dados: PDF "Relatório de Produtos Vendidos por Cliente/Vendedor" (Alterdata), importado pelas lojas. Extrato de Produtos e Curva ABC não são mais usados.
- WhatsApp pela Uazapi (uma instância e um token por loja, `localStorage['cesta_uazapi']`). No teste, os envios são simulados.
- Sem IA externa: toda a "inteligência" roda no navegador.
- Arquivos da cesta são enormes: editar com buscas pontuais, nunca ler o arquivo inteiro. Não existe fonte separada (os antigos `app3.js` e `build3.py` não estão no repositório): o script da aplicação é o bloco `<script>` que começa com `CESTA DE PRODUTOS POR CLIENTE`, e ele deve ser **idêntico** em `cesta/` e `cesta-teste/` depois de promovido.

## Regras das mensagens (motor v5)
- `LIMITE_MSG=200`: mensagens automáticas até 200 caracteres, sem contar a linha do SAIR. O gerador (`montarSug`) e o verificador (`violacoesMsg`) usam a mesma medida (`tamMsg`). Kits e campanhas têm o texto da loja e ficam fora do limite.
- Assinatura: `"{Atendente} · Rei do Gado {Loja}"` (`assinaturaDe`). SAIR só na primeira mensagem ao cliente.
- Trava: 1 mensagem comum a cada 7 dias, nada nos 3 dias após uma compra, mesmo corte não volta em 7 dias. SAIR bloqueia tudo.
- Automático só até 30 dias sem comprar (`LIMITE_AUTO`); acima disso, só rascunho. Grupo de controle: 10% por mês.
- Antes de promover para produção: Ajustes → "Verificar todas as mensagens" tem de dar 100%.

## Fluxo de trabalho
- Editar → `node --check` no script extraído → testar em `cesta-teste/` → promover → commit em português.
- Nunca apagar dados do Realtime Database sem backup. Não mexer em regras de segurança/login sem perguntar.
- Usuário (Marcelo) trabalha em português do Brasil, no Mac, e prefere soluções simples, sem terminal.
