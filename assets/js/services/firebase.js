import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, collection, addDoc, setDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app = initializeApp({
  apiKey: "AIzaSyD5bRjagMvmXgxLEI8Pjnl-RSYgfhZvfCE", authDomain: "asesor-nutricionista.firebaseapp.com", projectId: "asesor-nutricionista",
  storageBucket: "asesor-nutricionista.firebasestorage.app", messagingSenderId: "773072878607", appId: "1:773072878607:web:bb12e84a4be5ae10c8b77a"
});
const okId = i => /^[\w%.~-]{1,210}$/.test(i);
const ALEXA_PAIR_WORDS = ['abeja','aceite','agua','aire','alba','album','algo','alma','almeja','alto','amigo','ancla','anillo','arbol','arena','arroz','avion','azul','barco','barrio','beso','blanco','bolsa','bosque','boton','brazo','brisa','brote','cabra','cable','cafe','caja','calma','campo','canela','canto','capa','carta','casa','casco','celda','cielo','cifra','cine','cinta','claro','clavo','cobre','coco','colina','coral','corto','cosecha','crema','cruz','dado','dardo','delta','disco','dona','drama','dulce','edad','enero','envio','erizo','espejo','estrella','faro','fecha','feria','fiesta','fila','flauta','foco','forma','foto','fruta','fuego','galleta','gato','genio','girasol','globo','goma','gota','grano','grillo','grupo','guante','guia','hielo','isla','jabon','jardin','jarra','juego','kiwi','lago','lana','lata','lecho','lente','libro','lima','linea','lista','lobo','luna','mapa','marco','mesa','metro','miel','menta','moneda','monte','motor','nube','noche','norte','nota','ola','olivo','oro','oso','oveja','pajaro','palma','papel','parque','pato','pecho','pera','perro','piedra','pino','playa','pluma','queso','radio','rama','ramo','rio','roca','rueda','sal','salsa','semilla','silla','sol','sopa','sur','taza','tela','tren','uva','vela','verde','viento','vino','yema','zorro'];
const auth = getAuth(app); let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) }); } catch (e) { db = initializeFirestore(app, {}); }
const cleanupAlexaPairingCodes = async user => {
  const q = query(collection(db, 'alexaLinkCodes'), where('ownerUid', '==', user.uid));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.filter(item => (item.data().expiresAt?.toMillis?.() || 0) <= Date.now()).map(item => deleteDoc(item.ref)));
};
window.fb = {
  login: (e, p) => signInWithEmailAndPassword(auth, e, p), logout: () => signOut(auth),
  createAlexaPairingCode: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Inicia sesión en la app antes de vincular Alexa.');
    await getIdToken(user, true);
    const refreshToken = user.refreshToken;
    if (!refreshToken) throw new Error('No se pudo preparar la sesión de Firebase. Vuelve a entrar en la app.');
    await cleanupAlexaPairingCodes(user);
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const code = [...bytes].map(byte => ALEXA_PAIR_WORDS[byte & 127]);
    const id = code.join('-');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await setDoc(doc(db, 'alexaLinkCodes', id), { ownerUid: user.uid, refreshToken, expiresAt });
    return { code: code.join(' '), expiresAt: expiresAt.getTime() };
  },
  deleteAlexaPairingCode: async code => {
    const user = auth.currentUser;
    if (!user) return;
    const id = String(code || '').toLowerCase().trim().replace(/\s+/g, '-');
    await deleteDoc(doc(db, 'alexaLinkCodes', id));
  },
  addMov: m => addDoc(collection(db, 'mov'), m),
  addCompra: c => addDoc(collection(db, 'compra'), c),
  setCompra: (id, d) => updateDoc(doc(db, 'compra', id), d),
  delCompra: id => deleteDoc(doc(db, 'compra', id)),
  setReceta: (id, d) => setDoc(doc(db, 'recetas', id), d),
  delReceta: id => deleteDoc(doc(db, 'recetas', id)),
  set: (c, id, d) => setDoc(doc(db, c, id), d), del: (c, id) => deleteDoc(doc(db, c, id))
};
let u1, u2, u3, u4, u5, u6, u7;
onAuthStateChanged(auth, u => {
  window.onUser(u); if (u1) u1(); if (u2) u2(); if (u3) u3(); if (u4) u4(); if (u5) u5(); if (u6) u6(); if (u7) u7(); u1 = u2 = u3 = u4 = u5 = u6 = u7 = null;
  if (!u) { window.onMovs([], false); window.onCompra([]); return; }
  cleanupAlexaPairingCodes(u).catch(e => console.warn('No se pudieron limpiar códigos Alexa caducados:', e));
  u1 = onSnapshot(query(collection(db, 'mov'), orderBy('t')), { includeMetadataChanges: true }, sn => window.onMovs(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() })), sn.metadata.fromCache), e => console.error(e));
  u2 = onSnapshot(collection(db, 'compra'), sn => window.onCompra(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u3 = onSnapshot(collection(db, 'recetas'), sn => window.onRecetas(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u4 = onSnapshot(collection(db, 'plan'), sn => window.onPlan(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u5 = onSnapshot(collection(db, 'ignorados'), sn => window.onIgn(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u6 = onSnapshot(collection(db, 'colegio'), sn => window.onCole(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u7 = onSnapshot(collection(db, 'alias'), sn => window.onAlias(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
});
