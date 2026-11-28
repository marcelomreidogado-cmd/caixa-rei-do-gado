# v5.12 — ciclo por produto, reconquista, promoções, limite e automações (28/11/2026)

Pedido do Marcelo em 28/11 (12h30), com as respostas dele às perguntas. Mantém tudo da v5.11 (motor único `cestaDaLinha`, porta única `podeSair`, linhas e dias, sem lista suspensa, revisor, janela 9–19h seg–sáb).

## 1. Recompra pelo ciclo de CADA produto (correção — prioridade 1)
**Achado:** cliente que compra patinho a cada 15 dias e frango a cada 8 recebeu os dois juntos, antes da hora do patinho. Causa no código: `perfilCliente` usa ciclo padrão de 7 dias (`CICLO_PADRAO`) quando o cliente tem só 1 compra daquele produto, e com 2 compras usa um único intervalo. Então o patinho "libera" no 7º dia.
**Regra nova:**
- Ciclo de um produto para um cliente = mediana dos intervalos dele com **3+ compras** daquele corte; com menos, usa o **ciclo da loja para aquele corte** (mediana dos intervalos de todos os clientes daquela loja que compram o corte ≥3 vezes); sem dado, 7 dias.
- Em "Hora de repor", entra **só o produto cuja data de reposição chegou** (hoje ≥ última compra + ciclo). Produto ainda no ciclo fica fora, mesmo que outro da mesma cesta já esteja na hora. Nunca dois produtos com datas diferentes "puxados" juntos.
- Simulação com o histórico real antes de publicar: listar os clientes que, com a regra antiga, teriam recebido produto antes do ciclo dele, e confirmar 0 na nova.

## 2. Limite diário por loja
80 mensagens por dia por loja a partir de 28/11, **+10 por semana, até 150**. Limite manual por loja em Ajustes → Regras continua. Desculpas continua fora do limite.

## 3. Reconquista (mais de 90 dias sem comprar)
- **Oferta real (Marcelo, 28/11):** entrega grátis + 10% de desconto **na próxima compra, válido por 7 dias** ("válido até dd/mm"). A loja aplica no caixa.
- **Produto de sempre primeiro** (a análise de 01–23/11: produto de sempre responde 22,5% contra 13,9% de novidade), com o preparo que está na cesta do cliente; só produto da linha liberada no dia.
- **Por tipo de cliente:** fiel = "senti sua falta"; esporádico = convite leve; comprou uma vez = reapresenta a loja com 1–2 produtos de entrada. "O que achou da compra" nunca mais para 90+ dias.
- **Até 3 toques:** 90, 120 e 180 dias, abordagens diferentes; para quando o cliente responde, compra ou depois do 3º.
- Voz da equipe quando houver frase boa; texto pronto de reserva. Mesmas travas de sempre.

## 4. Aba Kits → Promoções (manual e automática)
- Várias promoções ao mesmo tempo (não fica só uma). Cada uma: produto(s), preço/condição digitados pela loja, linha, validade, público.
- **Público pela linha e pelo motor:** promoção de hambúrguer = só quem passa em `cestaDaLinha(c,'hamb',{objetivo:'promo'})`. Chips de público iguais aos da Campanha (loja, tempo sem comprar, compra o produto / compra a linha). Nada de puxar todos os segmentos.
- **Sem mensagem duplicada:** o mesmo texto não entra duas vezes no kit/promoção (bug do "Noite do burger duplo"); o revisor barra texto repetido.
- **Automática:** a loja liga "sugerir sozinha" e a promoção entra nas "Prontas para hoje" nos dias da linha.
- **Resultado de cada promoção:** enviadas, respostas, compras em 7 dias, % — na própria aba.

## 5. Automações
1. **Envio automático diário — teste de 1 semana, terça a sábado:** às 9h a fila de cada loja se monta sozinha com as "Prontas para hoje" (respeita limite, linhas, revisor, porta); das 9h às 10h a loja vê a lista e pode tirar clientes; às 10h sai. Liga/desliga por loja em Ajustes; termina sozinho depois da semana de teste até o Marcelo confirmar.
2. **Painel de mensagens na Cesta (dash):** por dia e por loja — enviadas, respostas, compras em 7 dias, barradas pelo revisor, fora do limite, WhatsApp caído, computadores em versão antiga; por linha e por objetivo.
3. **Alterdata:** verificar se dá para acessar e importar sozinho. Não trava o resto; volta depois.
4. **Importar sem ir em Ajustes:** botão "Importar relatório" no topo; mostrar só a última importação de cada loja (o histórico de relatórios fica recolhido); limpar da lista os computadores que não abrem há 7+ dias.

## 6. Ir além (pente nas abas)
Depois dos itens acima, passar por todas as abas com os dados reais e listar o que ainda confunde ou erra, para o Marcelo escolher.

## Ordem de entrega (cada uma testada, simulada com dados reais, revisada e publicada)
1. Ciclo por produto + limite 80→150. 2. Reconquista. 3. Promoções. 4. Envio automático (teste ter–sáb) + painel de mensagens. 5. Importar fora de Ajustes + limpezas. 6. Alterdata. 7. Pente nas abas.

## Decisões minhas (para conferir)
- Ciclo da loja só com clientes que compraram o corte ≥3 vezes; senão 7 dias.
- Reconquista para no 3º toque sem resposta.
- O teste do envio automático desliga sozinho depois de 1 semana.
