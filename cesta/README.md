# Cesta Rei do Gado — CRM principal

Produção: https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/cesta/
Teste: https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/cesta-teste/
Ficha de um cliente: `.../cesta/?cliente={CODIGO}`

A Cesta é o sistema principal de clientes, mensagens, campanhas, promoções e kits do Rei do Gado Casa de Carnes (lojas Coronel, Correas e Bingen). O CRM antigo, feito no ChatGPT, foi desligado: a cesta não envia nem lê nada dele.

## O que faz
- Importa o PDF **"Relatório de Produtos Vendidos por Cliente/Vendedor"** do Alterdata (única fonte). A importação é feita pelas lojas.
- Monta o histórico de compras de cada cliente, o perfil (churrasco, dia a dia, hambúrguer) e o que oferecer.
- Envia as mensagens pelo WhatsApp de cada loja (Uazapi), com trava contra repetição, SAIR e grupo de controle.
- Telas: Hoje, Conversas, Clientes, Campanhas (Segmentos, Sugestões, Recompra, Reconquista, Kits), Produtos, Painel e Ajustes.

## Como é feito
Arquivo único (`index.html`), sem build. O leitor de PDF (pdf.js 3.11) e o de planilhas (SheetJS 0.18.5) vão embutidos. Os dados ficam no navegador (IndexedDB) e na nuvem (Firebase Realtime Database, projeto `motoboy-ddefa`, pasta `cesta_rei_do_gado`), acessada por REST, sem SDK.

Toda mudança entra primeiro em `/cesta-teste/` e só depois é promovida para `/cesta/`. Antes de promover, em Ajustes → "Verificar todas as mensagens", o resultado tem de ser 100%.
