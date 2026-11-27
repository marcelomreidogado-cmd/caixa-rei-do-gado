# Campanhas por linha — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um motor único monta a cesta de cada cliente por linha (Dia a dia, Churrasco, Hambúrguer) e dia da semana; a aba Campanhas, as sugestões de campanha, Recompra, Sugestões e Hoje usam só esse motor e são operadas por botões, sem lista suspensa.

**Architecture:** Funções novas no bloco de script "CESTA DE PRODUTOS POR CLIENTE" de `cesta-teste/index.html`: `linhaMsgDe` → `linhaLiberada` → `cestaDaLinha`. `podeSair` (porta única da v5.10) recebe a linha no `sg`/`opt` e recusa o que o motor recusa. As telas leem só `cestaDaLinha` e `podeSair`.

**Tech Stack:** HTML estático, JS ES5 no navegador, Realtime Database por REST; testes com Playwright + mocks em `/home/claude/build`.

**Spec:** `docs/superpowers/specs/2026-11-26-campanhas-por-linha-design.md` (aprovado em 26/11, 20h03).

## Global Constraints
- Editar só `cesta-teste/index.html`; `cesta/` só na promoção (Task 6), com o bloco de script idêntico.
- Sintaxe ES5 nas linhas novas: sem arrow, `let`/`const`, `?.`, `??`, lookbehind, template string.
- Linhas: `'dia'` = Dia a dia, `'churrasco'` = Churrasco, `'hamb'` = Hambúrguer.
- Churrasco só **quarta a domingo** (`getDay()` 3,4,5,6,0). Dia a dia e Hambúrguer todos os dias.
- Ciclo: corte comprado há menos que o ciclo dele (padrão 7 dias) não entra na cesta (`travaCorte` já calcula).
- No máximo **1 novidade** por mensagem.
- Bebida, carvão e acessórios nunca (v5.10: `papelOferta(x)==='nunca'`). Acompanhamento (pão, queijo, bacon, pão de alho) só junto de carne da mesma linha (`itensOferta`).
- Mantém tudo da v5.9/v5.10: revisor, `textoFinal`, janela 9–19h seg–sáb, limite por loja, SAIR, pausa, 7 dias, 3 dias após compra, `LIMITE_MSG=200`, sem "fresco/fresquinho", loja "Rei do Gado X".
- **Nenhum `<select>`** nas telas da Cesta (exceto `input type=file`). Filtros = chips/botões que se somam.
- Estilo em classes no bloco `<style id="cesta-polimento-v1">`; sem `style="..."` em linhas/cartões.
- Proibido escolher produto fora de `cestaDaLinha`. Proibido filtro paralelo à `podeSair`.

## Review Focus
1. Cliente sem nenhuma compra da linha escolhida em "Hora de repor": deve ficar fora com motivo "não compra esta linha", nunca receber produto de outra linha. → teste em Task 1.
2. Produto sem linha mapeada (cadastro novo, família "Outros"): não entra em nenhuma cesta. → teste em Task 1.
3. Virada de dia com a tela aberta (terça 23h59 → quarta): cache do motor por dia, churrasco libera sem recarregar. → teste em Task 1 (relógio falso).
4. Campanha de churrasco criada no domingo e agendada para segunda: a fila não envia (confere `linhaLiberada` na hora de sair). → teste em Task 3.
5. Cliente de duas lojas: cesta e venda cruzada calculadas pela loja da campanha. → teste em Task 2.

---

### Task 1: Motor `cestaDaLinha` + porta

**Files:**
- Modify: `cesta-teste/index.html` (perto de `ofertaHoje0`, ~3739; `podeSair0`, ~4180)
- Test: `/home/claude/build/linhatest.js`

**Interfaces:**
- Produces:
  - `LINHAS_MSG = {dia:{nome:'Dia a dia',ico:'🥩'}, churrasco:{nome:'Churrasco',ico:'🔥'}, hamb:{nome:'Hambúrguer',ico:'🍔'}}`
  - `linhaMsgDe(prod) -> 'dia'|'churrasco'|'hamb'|''` — a partir de `linhaDe` (família): Bovinos dia a dia, Frango (filé/peito/sobrecoxa/estrogonofe/desfiado), Suínos que não são de churrasco → `'dia'`; Churrasco nobre, Wagyu, Cordeiro, Suínos e linguiças de churrasco, frango de churrasco (coxinha/coração/espeto/temperado de grelha) → `'churrasco'`; Hambúrguer → `'hamb'`; acompanhamento herda a linha da carne com que vai (pão de alho/queijo coalho → churrasco; pão/cheddar/bacon de hambúrguer → hamb); o resto → `''`.
  - `linhaLiberada(linha, data?) -> {ok:boolean, motivo:string, volta:string}` — churrasco seg/ter = `{ok:false,motivo:'churrasco só de quarta a domingo',volta:'quarta'}`.
  - `cestaDaLinha(c, linha, opt?) -> {ok, motivo, habituais:[prod], novidade:prod|null, itens:[prod], fora:[{nome,motivo}]}` — `opt.objetivo`: `'repor'|'apresentar'|'voltar'|'boasvindas'|'promo'|'noite_hamb'`; `opt.loja`; `opt.data`. Cache por cliente+linha+objetivo+dia (`S._gv` e `pfLimparCli` invalidam).
  - `podeSair(c, sg, ctx, opt)` passa a recusar quando `sg.linha`/`opt.linha` está presente e `cestaDaLinha` recusa, ou quando a mensagem cita produto de outra linha.

- [ ] **Step 1: Escrever `linhatest.js`** com fixture (padrão do `v510btest.js`: `setup_t.js`, import fictício no IndexedDB, relógio falso via `page.clock`) e asserções:
  - `linha_terca_sem_churrasco`: terça → `linhaLiberada('churrasco').ok===false`; `cestaDaLinha(CH,'churrasco').ok===false`; `podeSair` de uma `sg` de churrasco recusa.
  - `linha_qua_a_dom`: quarta, quinta, sexta, sábado, domingo → `ok===true`.
  - `ciclo_picanha`: cliente comprou PICANHA ANGUS numa terça (D-3, sexta) e compra a cada 14 dias → `cestaDaLinha(c,'churrasco').itens` não contém picanha.
  - `patinho_mais_frango`: cliente compra só PATINHO (5 compras) → `habituais` tem patinho, `novidade` é FILE DE FRANGO (o mais levado por quem compra patinho no fixture).
  - `dia_sem_churrasco_hamb`: em `'dia'`, nenhum item com `linhaMsgDe!=='dia'`; idem para `'churrasco'` e `'hamb'`.
  - `hamb_acomp`: cliente compra PAO HAMB AUSTRALIANO e HB PICANHA → pão só aparece depois do HB; com HB no ciclo, a cesta não tem só o pão (`ok===false` ou outro HB lidera).
  - `uma_novidade`: `itens.filter(novidade).length<=1` para todos os clientes do fixture.
  - `sem_linha`: produto de família "Outros" nunca aparece.
  - `repor_sem_linha`: cliente só de dia a dia em `'churrasco'`/`'repor'` → `ok===false`, `motivo` contém "não compra".
  - `virada_dia`: relógio terça 23:59 → churrasco fora; avança para quarta 00:01 sem recarregar → `ok===true`.
  - `mesma_cesta`: para 5 clientes, `cestaDaLinha` chamada 2× e via `podeSair` dá a mesma lista.
- [ ] **Step 2:** `(bash mocks.sh &) ; sleep 3; cp ../caixa-rei-do-gado/cesta-teste/index.html cesta-teste.html; node linhatest.js` → ERRS com as falhas (funções inexistentes).
- [ ] **Step 3:** Implementar `LINHAS_MSG`, `linhaMsgDe`, `linhaLiberada`, `cestaDaLinha` reaproveitando `cestaPerfil`, `travaCorte`, `itensOferta`, `papelOferta` (novidade = produto ativo da mesma linha, nunca comprado, maior "lift" entre clientes que compram os mesmos habituais, mesma loja; empate → mais vendido na loja). Ligar em `podeSair0`.
- [ ] **Step 4:** `node linhatest.js` → `ERRS []`; `node --check` no script extraído; bateria antiga inteira (lista do CLAUDE.md + v510test, v510btest) → `ERRS []`.
- [ ] **Step 5:** Commit `Teste: motor cestaDaLinha (linha + dia + ciclo + 1 novidade)`.

### Task 2: Sugestões de campanha por linha + venda cruzada

**Files:**
- Modify: `cesta-teste/index.html` — substituir o corpo de `sugestoesCamp()` (~1740); manter `promoPerfis`.
- Test: `/home/claude/build/sugltest.js`

**Interfaces:**
- Consumes: `cestaDaLinha`, `linhaLiberada`, `LINHAS_MSG`.
- Produces: `sugestoesCamp() -> [{id, linha, objetivo, tit, desc, n, exemplo:{cliente, mensagem}}]` onde `id = linha+':'+objetivo` e objetivo ∈ `repor`, `voltar`, `boasvindas`, `apresentar` (venda cruzada); `perfilLinhas(c) -> ['dia'|'churrasco'|'hamb']` (linhas com ≥2 compras em 180 dias).
- Venda cruzada: cliente com `perfilLinhas(c).length===1` entra em `apresentar` das outras linhas (churrasco só se `linhaLiberada`). Mensagem cita 1 a 3 produtos de entrada da linha nova e diz que a loja trabalha essa linha; nenhum produto da linha dele.

- [ ] **Step 1: `sugltest.js`**:
  - `cruzada_so_churrasco`: cliente só churrasco aparece em `dia:apresentar` e `hamb:apresentar`; mensagem sem produto de churrasco.
  - `cruzada_so_dia_terca`: terça → cliente só dia a dia em `hamb:apresentar`, não em `churrasco:apresentar`.
  - `sem_mistura`: em cada sugestão, todo produto citado na mensagem de exemplo tem `linhaMsgDe===linha`.
  - `terca_sem_cartao_churrasco`: terça → nenhuma sugestão com `linha==='churrasco'`.
  - `duas_lojas`: cliente com compras em Coronel e Bingen, `S.loja='BINGEN'` → cesta e novidade só com produtos vendidos na Bingen.
  - `n_igual_podeSair`: `n` = quantos clientes da sugestão passam em `podeSair`.
- [ ] **Step 2:** rodar → falha. **Step 3:** implementar. **Step 4:** rodar `sugltest`, `linhatest`, `camptest` → `ERRS []`.
- [ ] **Step 5:** Commit `Teste: sugestões de campanha por linha e venda cruzada`.

### Task 3: Aba Campanhas nova (linha → objetivo → público → prévia)

**Files:**
- Modify: `cesta-teste/index.html` — `telaCampanhas` (~1804), `novaCampanha` (~1738), `publicoCamp` (~1733), `podeCamp` (~2994), `sgTextoLoja`/gerador de campanha; CSS no `cesta-polimento-v1`.
- Test: `/home/claude/build/camplinhatest.js`; fotos `/home/claude/build/shotcamp.js` (390 e 1440).

**Interfaces:**
- Consumes: `cestaDaLinha`, `sugestoesCamp`, `podeSair`.
- Produces: campanha grava `cp.linha` e `cp.objetivo` e `cp.filtros={lojas:[],dias:''|'0-15'|'15-30'|'30-60'|'60+',produtos:[]}`; `publicoCamp(cp)` = clientes do filtro com `cestaDaLinha(c,cp.linha,{objetivo:cp.objetivo,loja:cp.loja}).ok`; a mensagem de cada cliente sai de `cestaDaLinha(...).itens`. Campanha antiga sem `cp.linha` continua funcionando como hoje.
- Tela: passo 1 três cartões de linha (com contagem de hoje; churrasco seg/ter apagado "volta na quarta"); passo 2 botões de objetivo (Noite de hambúrguer só em Hambúrguer); passo 3 chips de loja, tempo sem comprar e produtos da linha, contador ao vivo; passo 4 prévia cliente a cliente (cesta habitual + novidade + mensagem + entra/fora e por quê) e "Criar e enviar para a fila" com o resumo de v5.8 (exemplos, barrados, limite, horário). Sugestões automáticas (Task 2) no topo como cartões "pronto" que abrem o passo 4 já preenchido. "Minhas campanhas" continua logo abaixo dos indicadores.
- `processarFila`: item de campanha com `linha` confere `linhaLiberada` na hora de sair; fora do dia → volta para a fila até o próximo dia liberado (não é pulado).

- [ ] **Step 1: `camplinhatest.js`**: sem `<select>` na aba; terça → cartão churrasco com `disabled` e texto "volta na quarta"; criar campanha Dia a dia/Hora de repor → público só com quem passa em `cestaDaLinha`; prévia mostra a mesma cesta que `cestaDaLinha`; nenhuma mensagem com produto de outra linha; campanha churrasco agendada domingo→segunda: `processarFila` na segunda não envia, na quarta envia; campanha antiga (sem `linha`) ainda abre e envia; desculpas (`desculpas:true`) intactas (rodar `v59dtest`).
- [ ] **Step 2:** rodar → falha. **Step 3:** implementar. **Step 4:** `camplinhatest`, `camptest`, `v59dtest`, `kittest`, `v510btest` → `ERRS []`; fotos 390/1440 com `scrollWidth` ≤ largura.
- [ ] **Step 5:** Commit `Teste: aba Campanhas por linha`.

### Task 4: Recompra, Sugestões e Hoje pela linha

**Files:**
- Modify: `cesta-teste/index.html` — `telaRecompra` (~4628), `telaSugestoes` (~4585), `telaHoje` (~1375), `filaDoDia` (~2185), `blocoCesta` (~3895: mostrar a cesta da linha escolhida, sem limite de 6/14 itens fixo — todos os produtos da linha que o cliente compra + a novidade).
- Test: `/home/claude/build/abaslinhatest.js`

**Interfaces:**
- Consumes: `cestaDaLinha`, `linhaLiberada`, `LINHAS_MSG`.
- Produces: `S.linhaSel` (`''` = todas as linhas liberadas hoje), barra de 3 botões de linha no topo das três abas (`barraLinha(ctx)`), mesma barra para todas.

- [ ] **Step 1: `abaslinhatest.js`**: com `S.linhaSel='dia'`, Recompra/Sugestões/Hoje não mostram produto de churrasco/hamb nem na cesta nem na mensagem; terça com `S.linhaSel=''` nada de churrasco; o mesmo cliente tem a mesma cesta nas três abas e na Campanha (Task 3); cliente que compra 10 produtos de dia a dia mostra os 10 na cesta da linha.
- [ ] **Step 2–4:** falha → implementar → `abaslinhatest`, `hojetest`, `rq2test`, `v510test`, `v510btest`, `linhatest` → `ERRS []`.
- [ ] **Step 5:** Commit `Teste: Recompra, Sugestões e Hoje pela linha`.

### Task 5: Fim das listas suspensas

**Files:**
- Modify: `cesta-teste/index.html` — as 26 ocorrências de `<select` (`grep -n "<select"`), CSS de chips no `cesta-polimento-v1`.
- Test: `/home/claude/build/semselecttest.js`

**Interfaces:**
- Produces: `chipsSeg(nome, opcoes:[{v,t}], valor, multi) -> html` com `data-chip="nome"`; um handler delegado grava o valor no mesmo lugar onde o `<select>` gravava (mesmos `S.*`/`kf.*`), para não mudar a lógica dos filtros.

- [ ] **Step 1: `semselecttest.js`**: percorre todas as abas e modais conhecidos → 0 `<select>` visível; cada filtro trocado muda a lista como antes (um caso por tela: Clientes família, Produtos linha, Conversas loja, Ajustes regras).
- [ ] **Step 2–4:** falha → implementar → `semselecttest` + bateria inteira → `ERRS []`; fotos 390/1440 de todas as abas, `scrollWidth` ok.
- [ ] **Step 5:** Commit `Teste: filtros em botões (sem listas suspensas)`.

### Task 6: Pente fino com dados reais, revisão e publicação

**Files:**
- Create: `/home/claude/build/pente511.js` (base `pente510.js` + `m4load.js`)
- Modify: `CLAUDE.md` (seção v5.11), `cesta/index.html` (promoção)

- [ ] **Step 1:** `pente511.js` com os 4.532 clientes reais, para cada dia da semana (relógio falso) e cada linha: 0 produto de outra linha, 0 churrasco seg/ter, 0 produto no ciclo, 0 bebida/carvão, ≤1 novidade, mesma cesta em todas as abas; imprime contagens por linha/objetivo e 10 mensagens de amostra por linha.
- [ ] **Step 2:** bateria inteira + `timeout 600 node m5t.js` + `pente511.js` → tudo zero/`ERRS []`.
- [ ] **Step 3:** revisão independente (agente só leitura) da diferença contra a v5.10; corrigir graves e médios.
- [ ] **Step 4:** promover (bloco de script e de estilo idênticos), `versao:'5.11'`, seção v5.11 no CLAUDE.md, commit `Produção: v5.11 — campanhas por linha`, push, `gh run list -L 1`.

### Task 3b: mensagens das linhas com a voz da equipe + kafta nas duas linhas (decisões do Marcelo, 26/11 20h43)

**Files:**
- Modify: `cesta-teste/index.html` — `sgLinha` (Task 2), `linhaMsgDe` (Task 1), aprendizado existente (`aprenderMensagensEquipe`, `lerLinguagem`, `aprOk`, `S.cfg.aprendidas`).
- Test: `/home/claude/build/vozlinhatest.js`

**Interfaces:**
- `linhaMsgDe(prod)` continua devolvendo a linha principal; novo `linhasDoProduto(prod) -> ['dia','churrasco']` para produtos das duas linhas (KAFTA). `cestaDaLinha` aceita o produto em qualquer linha da lista.
- `sgLinha(c,linha,obj,loja)`: a abertura, a frase de oferta e o fechamento vêm das frases já captadas das mensagens da equipe (as que tiveram resposta/compra, não anuladas, aprovadas por `aprOk` e pelo revisor), escolhidas por linha e objetivo; o texto fixo atual ("O Rei do Gado X também trabalha com…", "Já está na hora de repor…") fica como reserva quando não há frase aprendida válida.

- [ ] **Step 1:** `vozlinhatest.js`: com frases da equipe no histórico do fixture, `sgLinha` usa uma delas (texto contém a frase aprendida) e continua passando no revisor, ≤200, sem "fresc", assinatura; sem frases, usa a reserva; frase anulada (`anulados`) nunca é usada; KAFTA aparece na cesta de dia e de churrasco; o ciclo da kafta vale nas duas.
- [ ] **Step 2–4:** falha → implementar → `vozlinhatest`, `sugltest`, `linhatest`, `camplinhatest`, bateria → `ERRS []`.
- [ ] **Step 5:** Commit `Teste: voz da equipe nas mensagens por linha; kafta nas duas linhas`.

### Task 4b: mensagem automática nunca diz que algo chegou (decisão do Marcelo, 27/11 09h17)

Regra: a equipe pode escrever "Chegou…/Acabamos de receber…/Acabei de receber…/lote novo" na conversa (ela sabe); mensagem montada pelo sistema não pode, porque o sistema não sabe o que chegou.

**Files:** `cesta-teste/index.html` — `regrasContato.chegadaAuto` passa a padrão **false**; com false, nenhuma mensagem do sistema (montarSug e modelos `BIB_PREP`/`{chegou}`/`chegouTxt`, voz da equipe, sgLinha, sgReconq, sgTextoLoja com `{itens}`, promoção automática, kits gerados) contém `RE_CHEGOU_TXT`; modelos com `{chegou}` trocam por versão sem chegada ("Posso separar…"). Hambúrguer "Acabamos de produzir": mantido (regra anterior do Marcelo) até ele dizer o contrário — perguntado em 27/11. O revisor (`violacoesMsg`) barra frase de chegada em mensagem do sistema quando `chegadaAuto` é false. Texto digitado pela equipe e texto fixo da loja em campanha/kit não são alterados.
**Test:** `/home/claude/build/chegadatest.js` — com o padrão, 0 mensagens do sistema com chegada em todas as abas e objetivos (fixture e m4load); conversa digitada com "Chegou picanha" sai igual; com `chegadaAuto=true` volta a permitir para peça crua.
- [ ] Commit `Teste: mensagem automática nunca anuncia chegada`.
