# Cesta de Produtos por Cliente — Rei do Gado

Link: https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/cesta/

Ferramenta de cesta de produtos por cliente para o CRM:
- Importa o PDF "Extrato de Produtos - Com Saldo e Resumo por Operação" (Alterdata).
- Mostra clientes, sugestões de oferta, recompra, produtos, painel de cadastro por loja e funcionários.
- Sincroniza códigos CRM, configurações e relatórios no Firebase Realtime Database
  (projeto motoboy-ddefa, pasta `cesta_rei_do_gado`), via REST, sem SDK.

Arquivo único (`index.html`), com o leitor de PDF (pdf.js 3.11) embutido. Não tem build:
para atualizar, basta substituir o `index.html` e o GitHub Pages publica sozinho.
