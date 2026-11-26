# Campanhas por linha — desenho (26/11/2026) — APROVADO pelo Marcelo em 26/11, 20h03

## Por que
As sugestões, a Recompra e as campanhas misturam linhas: churrasco aparece na terça, e churrasco aparece quando a loja escolhe "dia a dia". Cada correção foi feita no sintoma, em uma tela, e a seguinte quebrava outra. A loja não confia no que o sistema sugere.

Objetivo: a loja abre Campanhas, escolhe a linha e recebe, para cada cliente, uma cesta certa daquela linha. Tudo com botões, sem lista suspensa. A mesma resposta aparece em todas as abas.

## Como paramos de remendar
1. **Uma regra escrita só** (este documento). O código segue o documento; o documento não segue o código.
2. **Casos de aceite escritos antes do código** (abaixo). Viram teste automático. Nenhuma versão vai ao ar sem todos passarem com os dados reais.
3. **Um motor só:** `cestaDaLinha(cliente, linha, dia)`. Hoje, Sugestões, Recompra, Reconquista, Produtos, Campanhas (automática e manual), lote e fila chamam ela. É proibido escolher produto em outro lugar.
4. As telas são refeitas por cima desse motor. Não se acrescenta filtro em tela antiga.

## As regras (do Marcelo)
### Linhas
| Linha | Produtos (famílias da cesta) | Quando pode sair |
|---|---|---|
| Dia a dia | Bovinos dia a dia (patinho, alcatra, contrafilé, acém, músculo, coxão, filé mignon), frango do dia a dia (filé, peito, sobrecoxa, estrogonofe), suínos do dia a dia | todos os dias |
| Churrasco | Churrasco nobre, Wagyu, Cordeiro, linguiças e suínos de churrasco, frango de churrasco (coxinha, coração), queijo coalho e pão de alho só junto de carne | **quarta a domingo** (dias de jogo e fim de semana). Segunda e terça nunca |
| Hambúrguer | hambúrgueres; pão, queijo e bacon só junto de hambúrguer | todos os dias |

- Bebida, carvão e acessórios nunca são oferecidos (já vale desde a v5.10).
- "Noite de hambúrguer" quando o tempo está ruim: um botão que a loja aperta. O sistema não consulta previsão do tempo.

### A cesta de um cliente numa linha
1. **O que ele já compra daquela linha**, na ordem do que mais compra, tirando o que está no ciclo (comprou há menos tempo do que costuma repor; padrão 7 dias). Quem comprou picanha na terça não recebe picanha na sexta.
2. **O que falta da linha**: produtos que ele nunca comprou e que quem compra o mesmo que ele mais leva (ex.: compra patinho → oferecer frango). No máximo 1 novidade por mensagem.
3. Recusas, SAIR, pausa, 7 dias entre mensagens, 3 dias após compra: continuam como hoje.
4. Cliente sem nada liberado na linha não entra (lista limpa) e aparece só na contagem "fora, por quê".
5. Cliente que nunca comprou da linha só entra se a campanha for de "apresentar a linha" (ex.: cliente só de churrasco recebe apresentação do dia a dia) — com 1 a 3 produtos de entrada da linha.

## A aba Campanhas (nova)
Tudo em botões e cartões. Nenhuma lista suspensa.

1. **Linha** — três cartões grandes: Dia a dia · Churrasco · Hambúrguer. No cartão: quantos clientes têm cesta liberada hoje. Churrasco segunda/terça: cartão apagado, "volta na quarta".
2. **Objetivo** — botões: Hora de repor · Apresentar a linha · Trazer de volta (30+ dias) · Boas-vindas · Promoção · Noite de hambúrguer (só em Hambúrguer).
3. **Público** — chips que se somam: loja, tempo sem comprar (até 15 · 15–30 · 30–60 · 60+), produto (chips com os produtos da linha). Contador ao vivo.
4. **Prévia e conferência** — para cada cliente: a cesta (o que compra + a novidade), a mensagem pronta, e a decisão (entra / fora e por quê). Navegar cliente a cliente. Botão "Criar e enviar para a fila" com o resumo (quantos, limite do dia, horário).

**Campanhas de venda cruzada (pedido do Marcelo, 26/11):** cliente que compra de uma linha só recebe a apresentação das outras linhas que ele ainda não compra:
- só Churrasco → "Apresentar Dia a dia" e "Apresentar Hambúrguer";
- só Dia a dia → "Apresentar Hambúrguer" (todo dia) e "Apresentar Churrasco" (qua–dom);
- só Hambúrguer → "Apresentar Dia a dia" e "Apresentar Churrasco" (qua–dom).
A mensagem cita 1 a 3 produtos de entrada da linha nova (os mais levados por quem compra a mesma linha que ele) e diz que a loja também trabalha essa linha. Aparecem como cartões prontos em Sugestões de campanha, com a contagem de clientes.

Sugestões automáticas de campanha: as mesmas 3 linhas × objetivos, calculadas pelo motor; aparecem como cartões "pronto para enviar" no topo, só com as que fazem sentido hoje (churrasco só qua–dom).

Recompra, Sugestões e Hoje ganham os mesmos três botões de linha no topo (em vez de listas suspensas) e mostram a cesta da linha escolhida.

## Filtros em todas as telas
- Trocar todas as listas suspensas (26) por chips/botões segmentados que se somam.
- Visual: o mesmo padrão do polimento de 15/11 (cores, raios, chips), sem cara de "gerado": títulos curtos, poucos textos explicativos, números grandes só onde a loja decide.

## Casos de aceite (viram testes)
1. Terça-feira: nenhuma mensagem, sugestão ou campanha de churrasco é gerada; cartão Churrasco apagado.
2. Quarta a domingo: churrasco liberado.
3. Cliente comprou picanha na terça; na sexta, a cesta de churrasco dele não tem picanha.
4. Cliente compra patinho e nunca comprou frango: cesta Dia a dia = patinho + frango (frango como novidade).
5. Cliente só de churrasco, campanha "Apresentar a linha" Dia a dia: recebe produtos de entrada do dia a dia; nenhum produto de churrasco.
6. Escolhida a linha Dia a dia em qualquer aba: nenhum produto de churrasco ou hambúrguer aparece na cesta ou na mensagem.
7. Hambúrguer: pão, queijo e bacon só aparecem junto de um hambúrguer.
8. O mesmo cliente, na mesma linha e no mesmo dia, tem a mesma cesta em Hoje, Sugestões, Recompra, Campanhas e na fila.
9. Nenhuma lista suspensa nas telas da Cesta (teste conta `<select>` = 0, menos o seletor de arquivo).
10. Cliente que só compra churrasco aparece na sugestão "Apresentar Dia a dia" e "Apresentar Hambúrguer", e a mensagem dele não cita nenhum produto de churrasco.
11. Com os dados reais: pente fino com 0 mistura de linha, 0 produto no ciclo, 0 bebida/carvão.

## Fora deste trabalho
- Previsão do tempo automática.
- Mudanças no texto das mensagens além do necessário para a cesta.
- Mudança no limite diário, janela de horário e revisor (continuam).

## Abordagens consideradas
- **Refazer em volta da linha com um motor único** — escolhida (pedido do Marcelo: parar de remendar).
- Remendar as telas atuais com filtro de linha — descartada: mantém a causa.
- Copiar a aba do CRM antigo — descartada: usava listas suspensas e oferecia carvão/batata primeiro.

## Decisões minhas (para o Marcelo conferir)
- Churrasco de **quarta a domingo** (entendi assim das duas falas).
- Filé mignon e sobrecoxa = Dia a dia (confirmado pelo Marcelo, 26/11 20h22).
- Frango de churrasco (coxinha, coração) conta como Churrasco; filé/peito/sobrecoxa/estrogonofe como Dia a dia.
- No máximo 1 novidade por mensagem, para não virar lista.
- Ordem de entrega: (1) motor + testes, (2) aba Campanhas nova, (3) Recompra/Sugestões/Hoje com os botões de linha, (4) troca das listas suspensas restantes. Cada etapa publicada só com todos os casos de aceite passando.
