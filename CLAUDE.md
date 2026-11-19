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
- A cesta **não publica mais nada para o CRM antigo** (desde a v4, de 14/11/2026). Os nós `crm`, `crm_tel`, `crm_meta` e `crm_hash` são legado: a versão nova os arquiva **sozinha** em `arquivo_crm_antigo/AAAA-MM-DD_HHhMM` (40 s após abrir e a cada 20 min) e só depois os apaga, porque abas antigas não recarregadas ainda gravam neles. Em Ajustes há "Conferir agora". O computador informa a versão (`versao:'4.5'`) em `computadores`.
- Nós da cesta: `imports_meta`, `imports_linhas`, `imports_cli`, `vinculos`, `config` (inclui `regrasContato`, `metaDiaria`, `metaCadastro` e `mesclas`), `contatos`, `contatos_ult`, `hist`, `seg`, `camp`, `lemb`, `kit_img`, `computadores`, `rev`. O teste usa `cesta_rei_do_gado/teste/…`.
- Única fonte de dados: PDF "Relatório de Produtos Vendidos por Cliente/Vendedor" (Alterdata), importado pelas lojas. Extrato de Produtos e Curva ABC não são mais usados.
- **Conexão com a Uazapi (v4.2):** canal ao vivo `GET /sse?token=…&events=messages,connection` por loja (`rtLigar`); com ele aberto a leitura por varredura cai de 45 s para 3 min. Vigia a cada 2 min (`checarNumeros` → `vigiarConexao`): aviso vermelho no topo, motivo (`lastDisconnectReason`), `POST /instance/reset` sozinho (no máx. 1 a cada 10 min, só se ainda logado) e botão Reconectar com QR code/código (`POST /instance/connect`). Quedas vão para `computadores/{pc}/quedas`.
- **Ao vivo entre computadores (v4.3):** cada gravação de conversa (`hist/K`) ou de registros (`contatos`) cria um aviso em `eventos/{chaveTempo}` = `{t:'hist'|'contatos'|'fila', K|ids|loja, pc}`. Todos os computadores ouvem `eventos` pelo canal de streaming do Firebase (`EventSource` em `eventos.json?orderBy="$key"&startAt=…`) e buscam só o que mudou (`tratarEvento`). Com o canal aberto, a sincronização completa roda a cada 2 min em vez de 30 s. Eventos com mais de 2 dias são apagados uma vez por dia.
- **Motor de envio (v4.3):** todo envio em lote e todo envio de cliente de outra loja entra em `fila/{LOJA}/{id}` (`loteUazapi` agora só enfileira, com a mensagem já pronta e assinada). Só o computador com o envio da loja ligado (`uazInst`) consome a fila (`processarFila`, a cada 20 s e na hora pelo aviso `fila`). Cada mensagem é pega por um computador só (PUT com `if-match`/ETag). Concluídas vão para `fila_feita/{LOJA}/{AAAA-MM-DD}/{id}` com `st` = enviado, pulado, falhou, verificar, cancelado ou expirado (24 h). Em dúvida (5xx ou interrompida), fica "verificar" e não é reenviada sozinha. Tela: Campanhas → Fila. `config/filaPausa` pausa a fila de uma loja.
- **Trava (v4.3):** WhatsApp da loja desconectado (`RT.estado[loja]==='caiu'`) = `uazEnviar`/`uazEnviarMidia` recusam e a fila para; continua sozinha quando reconecta.
- **Login (v4.4–4.5):** a cesta pede **só nome de usuário e senha** (regra do Marcelo para todo login). O nome vira `{nome}@reidogado.com.br` no Firebase Auth (`emailDeUsuario`; `caixa` = `caixa@reidogado.com.br`, o mesmo do Caixa). Usuários novos e troca da própria senha ficam em Ajustes → Conta (`criarUsuario` = `accounts:signUp`, `trocarMinhaSenha` = `accounts:update`). Não há "esqueci a senha" por e-mail (o domínio é interno). A cesta abre só depois do login (`prepararLogin`). O token vai em toda chamada (`fbUrl` → `?auth=`), é renovado sozinho (`renovarToken`, refresh token em `localStorage['cesta_auth']`; senha nunca é guardada). Todo login pode tudo, para qualquer loja; criar campanha **sempre** pergunta a loja (Coronel, Correas, Bingen ou Todas; a do topo vem marcada) e a campanha vale pela loja dela (`cp.loja`: público em `publicoCamp`, envio pela fila dessa loja), não pela loja escolhida no computador; o editor tem "Loja da campanha" para trocar. Envio em lote sem loja no topo pergunta a loja (`escolherLoja`). Preparando para outra loja, a assinatura é o 1º atendente cadastrado dela, sem perguntar (`atendPendente` só pergunta no computador da própria loja). `computadores/{pc}/usuario` mostra quem entrou em cada computador. Os testes automáticos pulam a tela com `localStorage['cesta_sem_login']='1'`.
- **Regras do Realtime Database (fechadas em 18/11/2026, 21h20):** `{"rules":{".read":"auth != null",".write":"auth != null"}}` — vale para tudo, inclusive `cesta_rei_do_gado` (a exceção aberta foi removida). Sem login a cesta não lê nem grava. Regra anterior (para voltar, se precisar): a mesma raiz + `"cesta_rei_do_gado":{".read":true,".write":true}`.
- **Pausa por cliente (v4.5):** decisão da loja, em `vinculos/{nk}.pausa = {ate:'AAAA-MM-DD' ou '9999-12-31', por, em, motivo}`. `pausado(c)` entra em `elegivel` (nada de automático, lote, campanha nem promoção) e na fila (`pulado`). Botão "Pausar" na coluna Pausa de Clientes e nas ações de Recompra/Reconquista/Sugestões (`celPausa`, `acoesMsg`). Mudança em `vinculos` avisa os outros computadores (`eventos` t:'vinc').
- **Filtros que se somam:** em Clientes os números (`kf.cli`) e a família (`kf.cliP`) são independentes; em Produtos, `kf.prod` e `kf.prodP`.
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

## Padrão visual (obrigatório em toda mudança)
Polimento visual feito em 15/11/2026. Para não regredir (o Compras piorou em 16–17/11 por isso):
- **Não colocar estilo solto (`style="..."`) em linhas de tabela, listas ou cartões.** Criar ou reutilizar classes no bloco de CSS do projeto (indicado abaixo). Estilo inline só para valores dinâmicos (cor de loja, largura de barra).
- **Tabelas compactas:** cada linha de produto/cliente/lançamento cabe em ~2 linhas de texto. Controles extras (marcações, botões) ficam pequenos e na mesma linha; detalhes vão para um modal ou para a dica (`title`).
- **Nada passa da largura da tela**, exceto tabelas largas dentro de um contêiner que desliza (com a coluna de nome fixa à esquerda no celular).
- **Celular primeiro:** conferir em 390 px e em 1440 px. No celular: navegação numa faixa/barra única, filtros e chips em faixa que desliza, indicadores em 2 colunas, textos sem cortar no meio da palavra.
- **Números** com algarismos alinhados (`font-variant-numeric: tabular-nums`), sem fonte monoespaçada; valores com sinal não quebram linha.
- Reaproveitar as cores, raios, botões e chips que o sistema já usa — não criar um estilo novo para cada tela.

### Conferência antes de publicar
1. Abrir o sistema com **dados fictícios** e **sem acesso ao banco real** (veja "Como testar o visual" abaixo).
2. Fotografar as telas alteradas em 390 px e 1440 px (Playwright já instalado no ambiente; Chromium em `/opt/pw-browsers`).
3. Medir que `document.documentElement.scrollWidth` não passa da largura da janela em todas as abas.
4. Mostrar ao Marcelo as fotos de **antes e depois** na resposta e dizer o que não foi testado.

### Onde fica o visual / como testar o visual
- **Caixa** (`index.html`): CSS no fim do `<style>` ("POLIMENTO VISUAL (nov/2026)"); no celular o menu é barra inferior. Teste com `window.firebase` falso (auth + `database().ref().get()`) devolvendo `caixa/{loja}/{id}` fictícios.
- **Cesta**: CSS no bloco `<style id="cesta-polimento-v1">` (antes de `</head>`). Mudar **primeiro em `cesta-teste/`**, conferir, e só então copiar o mesmo bloco para `cesta/` (as duas devem diferir só nas linhas do ambiente de teste). Teste: bloquear **toda** a rede (`context.route(/^https?:/, r => r.abort())`, para não enviar nada) e gravar um import fictício no IndexedDB `teste_cesta_rei_do_gado_v2` (store `imports`; linha = `[data, loja, cupom, cliente, codProd, descrição, qtd, preço, valor, op, codCliente]`), depois recarregar.
