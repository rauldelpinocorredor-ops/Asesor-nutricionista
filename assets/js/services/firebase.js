import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, collection, addDoc, setDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app = initializeApp({
  apiKey: "AIzaSyD5bRjagMvmXgxLEI8Pjnl-RSYgfhZvfCE", authDomain: "asesor-nutricionista.firebaseapp.com", projectId: "asesor-nutricionista",
  storageBucket: "asesor-nutricionista.firebasestorage.app", messagingSenderId: "773072878607", appId: "1:773072878607:web:bb12e84a4be5ae10c8b77a"
});
const okId = i => /^[\w%.~-]{1,210}$/.test(i);
const auth = getAuth(app); let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) }); } catch (e) { db = initializeFirestore(app, {}); }
window.fb = {
  login: (e, p) => signInWithEmailAndPassword(auth, e, p), logout: () => signOut(auth),
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
  u1 = onSnapshot(query(collection(db, 'mov'), orderBy('t')), { includeMetadataChanges: true }, sn => window.onMovs(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() })), sn.metadata.fromCache), e => console.error(e));
  u2 = onSnapshot(collection(db, 'compra'), sn => window.onCompra(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u3 = onSnapshot(collection(db, 'recetas'), sn => window.onRecetas(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u4 = onSnapshot(collection(db, 'plan'), sn => window.onPlan(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u5 = onSnapshot(collection(db, 'ignorados'), sn => window.onIgn(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u6 = onSnapshot(collection(db, 'colegio'), sn => window.onCole(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
  u7 = onSnapshot(collection(db, 'alias'), sn => window.onAlias(sn.docs.filter(d => okId(d.id)).map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
});