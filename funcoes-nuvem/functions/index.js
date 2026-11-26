// Recebe o webhook da Uazapi de cada loja e guarda a mensagem para a Cesta ler.
// Não envia nada, não guarda o token da Uazapi, ignora grupos e o que não for mensagem.
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp({ databaseURL: 'https://motoboy-ddefa-default-rtdb.firebaseio.com' });
const db = admin.database();
const RAIZ = 'cesta_rei_do_gado';
const LOJAS = ['CORONEL', 'CORREAS', 'BINGEN'];
const chaveTempo = () => Date.now().toString(36).padStart(9, '0') + crypto.randomBytes(3).toString('hex').slice(0, 4);
const cache = {}; // chave por loja, guardada 60 s
async function chaveDa(loja) {
  const c = cache[loja];
  if (c && Date.now() - c.em < 60000) return c.v;
  const v = (await db.ref(`${RAIZ}/config/entradaChave/${loja}`).get()).val();
  cache[loja] = { v, em: Date.now() };
  return v;
}
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

exports.cestaEntrada = onRequest(
  { region: 'southamerica-east1', maxInstances: 3, memory: '256MiB', timeoutSeconds: 20 },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).send('POST');
      const loja = String(req.query.loja || '').toUpperCase();
      const k = String(req.query.k || '');
      if (!LOJAS.includes(loja) || k.length < 24) return res.status(403).send('não');
      const certa = await chaveDa(loja);
      if (!certa || !igual(certa, k)) return res.status(403).send('não');
      let b = req.body;
      if (!b || typeof b !== 'object' || Buffer.isBuffer(b)) { try { b = JSON.parse(String(req.rawBody || b || '')); } catch (e) { b = null; } }
      if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).send('sem corpo');
      b = { ...b };
      delete b.token; delete b.Token; delete b.apikey; delete b.BaseUrl;
      const tipo = String(b.EventType || b.type || '');
      if (!/^messages$/i.test(tipo)) return res.status(200).send('ignorado');
      const m = b.message || {}, ch = b.chat || {};
      const jid = String(m.chatid || m.wa_chatid || ch.wa_chatid || '');
      if (m.isGroup || ch.wa_isGroup || /@g\.us$/.test(jid)) return res.status(200).send('grupo');
      const txt = JSON.stringify(b);
      if (txt.length > 200000) return res.status(200).send('grande');
      const id = chaveTempo(), agora = new Date().toISOString();
      await db.ref(RAIZ).update({
        [`entrada/${loja}/${id}`]: { em: agora, ev: txt },
        [`eventos/${chaveTempo()}`]: { t: 'entrada', loja, id, pc: 'nuvem', em: agora },
      });
      return res.status(200).send('ok');
    } catch (e) {
      console.error('cestaEntrada', e && e.message);
      return res.status(500).send('erro');
    }
  }
);
