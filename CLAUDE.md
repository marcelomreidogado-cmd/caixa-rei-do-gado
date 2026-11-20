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
- A cesta **não publica mais nada para o CRM antigo** (desde a v4, de 14/11/2026). Os nós `crm`, `crm_tel`, `crm_meta` e `crm_hash` são legado: a versão nova os arquiva **sozinha** em `arquivo_crm_antigo/AAAA-MM-DD_HHhMM` (40 s após abrir e a cada 20 min) e só depois os apaga, porque abas antigas não recarregadas ainda gravam neles. Em Ajustes há "Conferir agora". O computador informa a versão (`versao:'5.0'`) em `computadores`.
- Nós da cesta: `imports_meta`, `imports_linhas`, `imports_cli`, `vinculos`, `config` (inclui `regrasContato`, `metaDiaria`, `metaCadastro` e `mesclas`), `contatos`, `contatos_ult`, `hist`, `seg`, `camp`, `lemb`, `kit_img`, `computadores`, `rev`. O teste usa `cesta_rei_do_gado/teste/…`.
- Única fonte de dados: PDF "Relatório de Produtos Vendidos por Cliente/Vendedor" (Alterdata), importado pelas lojas. Extrato de Produtos e Curva ABC não são mais usados.
- **Conexão com a Uazapi (v4.2):** canal ao vivo `GET /sse?token=…&events=messages,connection` por loja (`rtLigar`); com ele aberto a leitura por varredura cai de 45 s para 3 min. Vigia a cada 2 min (`checarNumeros` → `vigiarConexao`): aviso vermelho no topo, motivo (`lastDisconnectReason`), `POST /instance/reset` sozinho (no máx. 1 a cada 10 min, só se ainda logado) e botão Reconectar com QR code/código (`POST /instance/connect`). Quedas vão para `computadores/{pc}/quedas`.
- **Ao vivo entre computadores (v4.3):** cada gravação de conversa (`hist/K`) ou de registros (`contatos`) cria um aviso em `eventos/{chaveTempo}` = `{t:'hist'|'contatos'|'fila', K|ids|loja, pc}`. Todos os computadores ouvem `eventos` pelo canal de streaming do Firebase (`EventSource` em `eventos.json?orderBy="$key"&startAt=…`) e buscam só o que mudou (`tratarEvento`). Com o canal aberto, a sincronização completa roda a cada 2 min em vez de 30 s. Eventos com mais de 2 dias são apagados uma vez por dia.
- **Motor de envio (v4.3):** todo envio em lote e todo envio de cliente de outra loja entra em `fila/{LOJA}/{id}` (`loteUazapi` agora só enfileira, com a mensagem já pronta e assinada). Só o computador com o envio da loja ligado (`uazInst`) consome a fila (`processarFila`, a cada 20 s e na hora pelo aviso `fila`). Cada mensagem é pega por um computador só (PUT com `if-match`/ETag). Concluídas vão para `fila_feita/{LOJA}/{AAAA-MM-DD}/{id}` com `st` = enviado, pulado, falhou, verificar, cancelado ou expirado (24 h). Em dúvida (5xx ou interrompida), fica "verificar" e não é reenviada sozinha. Tela: Campanhas → Fila. `config/filaPausa` pausa a fila de uma loja.
- **Trava (v4.3):** WhatsApp da loja desconectado (`RT.estado[loja]==='caiu'`) = `uazEnviar`/`uazEnviarMidia` recusam e a fila para; continua sozinha quando reconecta.
- **Login (v4.4–4.5):** a cesta pede **só nome de usuário e senha** (regra do Marcelo para todo login). O nome vira `{nome}@reidogado.com.br` no Firebase Auth (`emailDeUsuario`; `caixa` = `caixa@reidogado.com.br`, o mesmo do Caixa). Usuários novos e troca da própria senha ficam em Ajustes → Conta (`criarUsuario` = `accounts:signUp`, `trocarMinhaSenha` = `accounts:update`). Não há "esqueci a senha" por e-mail (o domínio é interno). A cesta abre só depois do login (`prepararLogin`). O token vai em toda chamada (`fbUrl` → `?auth=`), é renovado sozinho (`renovarToken`, refresh token em `localStorage['cesta_auth']`; senha nunca é guardada). Administrador (ou legado sem administrador) pode tudo; criar campanha pergunta a loja (Coronel, Correas, Bingen ou Todas; a do topo vem marcada) e a campanha vale pela loja dela (`cp.loja`: público em `publicoCamp`, envio pela fila dessa loja), não pela loja escolhida no computador; o editor tem "Loja da campanha" para trocar. Envio em lote sem loja no topo pergunta a loja (`escolherLoja`). Preparando para outra loja, a assinatura é o 1º atendente cadastrado dela, sem perguntar (`atendPendente` só pergunta no computador da própria loja). `computadores/{pc}/usuario` mostra quem entrou em cada computador. Os testes automáticos pulam a tela com `localStorage['cesta_sem_login']='1'`.
- **Permissões (v4.9):** `usuarios/{nome}` = `{papel:'adm'|'loja', loja}` (`meuPapel`, `restrito`, `minhaLoja`, `podeLoja`). Administrador: todas as lojas e cria/edita usuários em Ajustes → Conta. Usuário de loja: barra de lojas só com a dele, campanha sem pergunta e presa na loja (`#campLoja` travado), lista de campanhas só da loja, lote/fila só da loja, sem envio para cliente de outra loja, mensagens prontas só da loja. Login **sem cadastro** (ex.: `caixa`) fica preso à loja cujo WhatsApp envia no computador (`lojaDoComputador`). Enquanto não houver nenhum `adm`, tudo funciona como antes (`legado`) e Ajustes → Conta mostra "Criar o administrador" (não aceita `caixa`).
- **Índice das conversas (v4.9):** `conv/{K~LOJA}` = `{K,l,u,ud,ut,uc,ul,ad,rp:{em,s},li:{em,por}}` — uma conversa por cliente **e por WhatsApp de loja** (a loja é a da mensagem, não a do cadastro). `histAdd` → `cvRegistrar` → PATCH por campo + `eventos` t:'conv'; `carregarHist` alimenta o índice local (`cvLocal`); todos os computadores carregam `conv` ao abrir e a cada 10 min. Montagem inicial a partir de todo o `hist` (+ registros) uma vez só (`cvMontar`, trava em `conv_meta.lock`, pronto em `conv_meta.v=1`). Estados (`cvEstado`): aguardando = cliente escreveu por último nos últimos 7 dias (`CV_DIAS`) e não é agradecimento/ok/emoji (`encerraConversa`); não lida = nenhum login **da loja** abriu (`cvMarcarLido`; administrador abrindo não conta); respondida hoje + tempo de resposta (`rp`). Conversas: KPIs Aguardando/Não lidas/Respondidas hoje, chat só com as mensagens daquela loja, resposta sai pelo WhatsApp da loja da conversa; administrador em "Todas as lojas" vê o **Controle das lojas** (`blocoControleLojas`).
- **Revisão v4.9.1 (19/11, após revisão por agentes):** o índice recebe **todas** as mensagens que passam pelo `histAdd` (não só as novas) e o que `cvLocal` calcula também sobe; `cvEnviar` junta com a nuvem (GET + `cvMesclar`) antes do PATCH; a tela soma os registros de envio/resposta ao índice; `encerraConversa` reconhece agradecimento, ok, emoji, reação vazia, "Sair", respostas automáticas, "p vc tb" etc. (pergunta ou pedido continua aguardando; simulado no histórico real: 5 aguardando de verdade em 1.092 conversas); `cvMontar` grava a cada 30 clientes e retoma de `conv_meta.cur` (trava vence em 5 min); uma regra de loja do registro (`lojaReg`) no radar, na thread e na resposta; resposta na conversa sempre pelo WhatsApp da loja da conversa; selo da aba = aguardando **e** não lida. Transcrição: só o computador que **envia** pela loja do áudio (`uazInst`) transcreve sozinho (ao vivo, na varredura, no aviso `hist` e em `varrerAudios` ao abrir e a cada 5 min); `carregarHist` deixa a versão transcrita da nuvem vencer o cache; 3 falhas ou 404 = `tr:-1` (não tenta mais); o administrador vê "transcrição automática no computador da loja" no lugar do botão; o texto transcrito entra no aprendizado sem o 🎤 e atualiza a prévia do índice. Usuários ficam guardados no computador (`cesta_usuarios`) para não virar administrador se a nuvem falhar; restrito sem loja vê um aviso em vez dos dados.
- **Regras do Realtime Database (fechadas em 18/11/2026, 21h20):** `{"rules":{".read":"auth != null",".write":"auth != null"}}` — vale para tudo, inclusive `cesta_rei_do_gado` (a exceção aberta foi removida). Sem login a cesta não lê nem grava. Regra anterior (para voltar, se precisar): a mesma raiz + `"cesta_rei_do_gado":{".read":true,".write":true}`.
- **Pausa por cliente (v4.5):** decisão da loja, em `vinculos/{nk}.pausa = {ate:'AAAA-MM-DD' ou '9999-12-31', por, em, motivo}`. `pausado(c)` entra em `elegivel` (nada de automático, lote, campanha nem promoção) e na fila (`pulado`). Botão "Pausar" na coluna Pausa de Clientes e nas ações de Recompra/Reconquista/Sugestões (`celPausa`, `acoesMsg`). Mudança em `vinculos` avisa os outros computadores (`eventos` t:'vinc').
- **Conversa ao vivo (v4.6):** a mensagem que chega pelo canal ao vivo da Uazapi entra na conversa na hora (`rtMensagem`, usa o próprio conteúdo do evento; sem esperar a varredura) e vai para os outros computadores por `eventos`. A varredura (`radarRespostas`) continua em seguida para ligar a resposta ao envio e pegar SAIR; evento que chega com a varredura rodando não se perde (`RESP.radarDe`). Em Conversas, a faixa `#cvVivo` (`barraVivo`) mostra ao vivo/reconectando e tem "⟳ Atualizar agora" (`cvAtualizar`). **v4.7:** `rtExtrair` lê os dois formatos de evento (envelope de webhook `{EventType,message,chat}` e `{type,data}`); evento sem conteúdo busca só aquela conversa (`rtBuscarChat`, `/message/find` limit 10). A varredura roda a cada 45 s (20 s na aba Conversas) mesmo com o canal ao vivo aberto. Diagnóstico do formato que chega em `computadores/{pc}/sse` (só nomes dos campos, sem texto). Computador sem nome grava como `sem nome {LOJA} {id}` (id em `localStorage['cesta_pcid']`). Áudio que a Uazapi não tem mais (404) é marcado e sai da fila de transcrição (`audioIndisponivel`).
- **Mensagens prontas (v4.8):** `config/msgProntas` = `[{id,titulo,texto,loja('' = todas),img,por,em}]`, foto opcional em `kit_img/mp_{id}` (mesmo esquema dos kits: `salvarKitImg`/`mpBuscarImg`). Aparecem como atalhos na conversa (`mpChips`; `{nome}`, `{loja}`, `{atendente}` trocados em `mpTexto`); com foto, a conversa mostra "Vai com a foto" (`S.cvAnexo`) e envia por `uazEnviarMidia`. Gerenciar em "＋ Prontas" na conversa ou Ajustes → Mensagens prontas (`abrirProntas`). Salvar avisa os outros computadores (`eventos` t:'vinc').
- **Filtros que se somam:** em Clientes os números (`kf.cli`) e a família (`kf.cliP`) são independentes; em Produtos, `kf.prod` e `kf.prodP`.
- WhatsApp pela Uazapi (uma instância e um token por loja, `localStorage['cesta_uazapi']`). No teste, os envios são simulados.
- Sem IA externa: toda a "inteligência" roda no navegador.
- Arquivos da cesta são enormes: editar com buscas pontuais, nunca ler o arquivo inteiro. Não existe fonte separada (os antigos `app3.js` e `build3.py` não estão no repositório): o script da aplicação é o bloco `<script>` que começa com `CESTA DE PRODUTOS POR CLIENTE`, e ele deve ser **idêntico** em `cesta/` e `cesta-teste/` depois de promovido.

## Regras de negócio do motor de mensagens (inegociáveis — definidas pelo Marcelo em 19/11/2026)
Valem para Hoje, Sugestões, Recompra, Reconquista, Campanhas (inclusive Boas-vindas), lote e fila. Toda regra de bloqueio, cálculo de dias e escolha de público é **código determinístico**, aplicado **antes** de qualquer sugestão aparecer na tela. Nada disso fica em prompt.

1. **Perfil vivo do cliente** (um resumo compacto, atualizado a cada compra importada, mensagem ou áudio transcrito; o motor lê o perfil, não o histórico bruto):
   - `estagio`: `NUNCA_COMPROU` | `PRIMEIRA_COMPRA` | `RECOMPRA_CICLO` | `EXPANSAO_CESTA`
   - `ultima_compra_data`, `ultima_cesta` (cortes da última compra)
   - `produtos_recusados` (tirados das mensagens e dos áudios transcritos: "não quero", "não gosto", "não como", "prefiro outro"…)
   - `historico_produtos`: `{corte: {ultima_compra, ciclo_dias}}`
   - `preferencias` (resumo curto: carne magra, compra na sexta…) e `tom_preferido`
2. **Elegibilidade (filtro antes de exibir):**
   - **Ciclo do produto:** se `hoje − ultima_compra < ciclo_dias` daquele corte (padrão 7 dias para item semanal), o corte está **bloqueado**; só volta na data de reposição. Nunca oferecer o que o cliente comprou há 4 dias.
   - **Recusa:** corte em `produtos_recusados` é proibido em qualquer sugestão automática.
   - **Lista limpa:** cliente sem motivo válido para receber contato hoje **não aparece** em Hoje nem na lista de Campanhas. A loja continua podendo abrir o cliente em Conversas e mandar mensagem 1 a 1.
   - **Promoção** (`tipo == PROMOCAO`): libera para todos, bloqueando só quem comprou aquele mesmo produto hoje ou ontem (≤ 1 dia). As travas que já existem continuam: SAIR, pausa, só promo, 1 mensagem comum a cada 7 dias, 3 dias após compra.
3. **Jornada com mensagem pronta (sem escrita manual)**, pelo `estagio` + perfil:
   - `NUNCA_COMPROU`: boas-vindas com um item de entrada.
   - `PRIMEIRA_COMPRA` (D+1 a D+3): pós-venda perguntando o que achou dos itens exatos da `ultima_cesta` e convidando a provar outros cortes.
   - `RECOMPRA_CICLO`: lembrete na janela certa dos cortes habituais.
   - `EXPANSAO_CESTA`: corte complementar que nunca comprou, respeitando preferências e recusas.
4. **Conversas e áudios:** chegou mensagem ou áudio → transcrever → extrair fatos para o perfil (recusas, preferências, feedback) → sugerir resposta usando só o perfil + catálogo/promoções ativas.

### Como isso se encaixa na arquitetura real (não confundir)
- **Hoje** a cesta é página estática + **Realtime Database** (não Firestore), **sem Cloud Functions** e **sem IA externa**: o "agente" é JavaScript determinístico no navegador (`ofertaHoje` → `montarSug`/`sugestoes`, `estadoContato`, `elegivel`, `situacaoV5`, `bib4`, aprendizado em `aprenderMensagensEquipe`/`lerLinguagem`). Não há gasto de tokens em produção; tokens são gastos nas sessões de desenvolvimento — por isso as regras ficam aqui e no código, não em prompts.
- **Achados de 19/11/2026:**
  - `ofertaHoje` escolhe os cortes mais pesados do histórico sem olhar o ciclo de cada corte nem `produtosRecentes`. Ex.: Irena Borges comprou filé mignon em 10/11 e recebeu oferta de filé em 18/11, e a tela mostrava "cortes já oferecidos ficam fora" ao lado da oferta do mesmo corte.
  - Não existe detecção de recusa.
  - `publicoCamp` lista o segmento inteiro (ex.: Boas-vindas com 7 clientes e só 3 liberados).
  - Campanha nova nasce com o texto em branco para a loja escrever.
  - Segmentos criados em dobro aparecem como listas repetidas na ficha do cliente ("Boas-vindas" e "Hora de repor: Patinho" duas vezes).
- **Arquitetura DECIDIDA pelo Marcelo (19/11/2026, regra):** o motor fica **no próprio código da cesta** e o perfil é gravado na nuvem (`perfil/{K}` no Realtime Database), para todos os computadores verem o mesmo. Sem Cloud Functions, sem servidor, sem custo. Toda mudança **só acrescenta**: nada que já funciona é retirado, e nada pode deixar a cesta mais lenta (cálculos com cache por cliente e por dia).
- **Regra de código:** uma única função de trava, usada por Hoje, Sugestões, Recompra, Reconquista, Campanhas, lote e fila. É proibido criar outro filtro paralelo.
- **Implementado na v5.0 (19–20/11/2026):**
  - `perfilCliente(c)`: cortes com `ultima`, `ciclo` (mediana dos intervalos), `cicloUso` (padrão 7; teto 21 com 2 compras e 30 com 3+), `liberaEm`; `estagio`; `ultima_cesta`; recusas e preferências de `perfil/{K}`. Cache por cliente e por versão (`S._gv`, que sobe em `limparSugestoes`).
  - `travaCorte(c,produto,{promo})` é a trava única: recusa → ciclo → já oferecido (`produtosRecentes`); na promoção, só "comprou hoje/ontem".
  - `ofertaHoje` = cache de `ofertaHoje0` por dia + escolha da equipe + registros do cliente. Corte travado sai da oferta (`travados`). Sem corte livre (ou só acompanhamento livre) = `semMotivo`.
  - `elegivel` = travas antigas + `!semMotivoHoje` (lista limpa). O pós-venda (`posVenda`: 1ª compra, D+1 a D+3, sem mensagem depois da compra) passa pela espera pós-compra, mas respeita recusas.
  - `situacaoV5` → `'posvenda'` (`BIB5.posvenda`).
  - A fila confere recusa, ciclo e promoção na hora de enviar (`trvF`).
  - Campanha sem texto (ou com o texto padrão antigo) = mensagem automática da jornada (`campAuto`/`sgCamp`). O público na tela é só quem pode receber hoje (`podeCamp`); os outros aparecem só como contagem por motivo (`details.fora`).
  - Recusas e preferências vêm das mensagens e dos áudios transcritos (`pfExtrair`, frase a frase; pergunta não conta; "hoje não/ainda tenho" = 14 dias, "não quero/dispenso" = 30 dias, "não gosto/não como" = sempre). Sem corte na frase, a recusa vale para o que a loja ofereceu nos últimos 3 dias. A loja tira ou acrescenta recusa na ficha (✕ / "+ produto").
  - Leitura inicial das conversas antigas uma vez (`pfMontar`, `perfil_meta`).
  - Resposta sugerida na conversa (`respostaSugerida`, chip 💡): pedido, preço, PIX, horário, cardápio, recusa, agradecimento. Usa as mensagens prontas quando existem.
  - `novaLista` não cria lista com nome repetido, e a ficha mostra cada nome uma vez.
  - Revisão independente da v5.0 (20 achados) corrigida antes de publicar: cache devolve cópia, invalidação por cliente (`pfLimparCli`), pós-venda no envio 1 a 1 e por dia de compra, vocabulário pelo nome do produto (suíno/frango separados), frases partidas em "mas", Sugestões/Recompra/selo/caixa pela mesma trava, Recompra sem corte travado, `focoTravado` fora do lote, fila só confere itens de mensagem automática, `pfMontar` retoma pela última chave.
  - Pendências conhecidas: linguiça e alguns nomes não são reconhecidos nas recusas; uma função única `podeReceber(c,ctx)` ainda não substituiu todas as checagens espalhadas.

## Regras das mensagens (motor v5)
- `LIMITE_MSG=200`: mensagens automáticas até 200 caracteres, sem contar a linha do SAIR. O gerador (`montarSug`) e o verificador (`violacoesMsg`) usam a mesma medida (`tamMsg`). Kits e campanhas têm o texto da loja e ficam fora do limite.
- Assinatura: `"{Atendente} · Rei do Gado {Loja}"` (`assinaturaDe`). SAIR só na primeira mensagem ao cliente.
- Trava: 1 mensagem comum a cada 7 dias, nada nos 3 dias após uma compra, mesmo corte não volta em 7 dias. SAIR bloqueia tudo.
- Automático só até 30 dias sem comprar (`LIMITE_AUTO`); acima disso, só rascunho. Grupo de controle: 10% por mês.
- Antes de promover para produção: Ajustes → "Verificar todas as mensagens" tem de dar 100%.

## Fluxo de trabalho
- Editar → `node --check` no script extraído → testar em `cesta-teste/` → promover → commit em português.
- **Antes de publicar qualquer mudança na Cesta (obrigatório desde 19/11/2026, depois da regressão da v4.9):**
  1. Rodar a bateria inteira de testes automáticos (em `/home/claude/build`: vivotest, convtest, histtest, audtest, lgtest, kittest, rq2test, hojetest, camptest, f3test, a404test, mptest, v49test, trtest e o `m5t.js` com dados reais) — todos com `ERRS []`.
  2. **Simular com os dados reais, só leitura:** baixar o nó afetado (ex.: `hist`, `conv`) e rodar a lógica nova fora do navegador, conferindo os números e uma amostra do que aparece para a loja. Nada que mostre estado (pendente, lida, aguardando) vai ao ar sem essa simulação.
  3. **Revisão independente:** um agente revisor (só leitura) compara a versão nova com a anterior e procura erros, duplicidades e regressões; tudo o que for grave é corrigido antes de publicar.
  4. Nunca trocar uma tela que funciona por uma nova sem manter o que já existia (o que era melhor antes continua).
  5. Fotos antes/depois em 390 e 1440 px e dizer ao Marcelo o que não foi testado.
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
