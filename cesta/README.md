# Cesta de Produtos por Cliente — Rei do Gado

Link: https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/cesta/

Ferramenta de cesta de produtos por cliente para o CRM:
- Importa o PDF "Extrato de Produtos - Com Saldo e Resumo por Operação" (Alterdata).
- Importa a planilha "Clientes Curva ABC" (.xls) do Alterdata para vincular código do cliente e celular automaticamente.
- Mostra clientes, sugestões de oferta, recompra, produtos, painel de cadastro por loja e funcionários.
- Sincroniza códigos CRM, configurações e relatórios no Firebase Realtime Database
  (projeto motoboy-ddefa, pasta `cesta_rei_do_gado`), via REST, sem SDK.

Arquivo único (`index.html`), com o leitor de PDF (pdf.js 3.11) e o leitor de planilhas (SheetJS 0.18.5) embutidos. Não tem build:
para atualizar, basta substituir o `index.html` e o GitHub Pages publica sozinho.

## Integração com o CRM
A cesta publica uma ficha por cliente (pelo código do Alterdata) no Firebase, e o CRM só precisa ler:
- Ficha do cliente: `https://motoboy-ddefa-default-rtdb.firebaseio.com/cesta_rei_do_gado/crm/{CODIGO}.json`
- Procurar código pelo WhatsApp (55+DDD+número): `.../cesta_rei_do_gado/crm_tel/{NUMERO}.json`
- Data da última atualização: `.../cesta_rei_do_gado/crm_meta.json`
- Abrir a cesta completa do cliente: `https://marcelomreidogado-cmd.github.io/caixa-rei-do-gado/cesta/?cliente={CODIGO}`
