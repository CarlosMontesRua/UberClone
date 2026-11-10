import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';

const DOCUMENTS = 'documents';

export const documentService = {
  async createDocument(docData) {
    if (!docData.driverId) throw new Error('driverId es requerido para guardar documentos');
    const db = getDb();
    const docRef = doc(collection(db, DOCUMENTS));
    const now = new Date().toISOString();

    const payload = {
      id: docRef.id,
      driverId: docData.driverId,
      licenseNumber: docData.licenseNumber || '',
      licensePhoto: docData.licensePhoto || '',
      licenseExpiration: docData.licenseExpiration || docData.licenseExpiry || '',
      soatPhoto: docData.soatPhoto || '',
      soatExpiration: docData.soatExpiration || docData.soatExpiry || '',
      technicalInspectionPhoto:
        docData.technicalInspectionPhoto || docData.techInspectionPhoto || '',
      technicalInspectionExpiration:
        docData.technicalInspectionExpiration || docData.techInspectionExpiry || '',
      mercadopagoEmail: (docData.mercadopagoEmail || docData.mercadoPagoEmail || '').trim(),
      termsAccepted: Boolean(docData.termsAccepted ?? docData.acceptTerms),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, payload);
    return payload;
  },

  async getDocument(documentId) {
    const db = getDb();
    const snap = await getDoc(doc(db, DOCUMENTS, documentId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getDocumentsByDriverId(driverId) {
    if (!driverId) return [];
    const db = getDb();
    const q = query(
      collection(db, DOCUMENTS),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getPrimaryDocumentByDriverId(driverId) {
    const list = await this.getDocumentsByDriverId(driverId);
    return list.length > 0 ? list[0] : null;
  },

  async updateDocument(documentId, updates) {
    const db = getDb();
    await updateDoc(doc(db, DOCUMENTS, documentId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteDocument(documentId) {
    const db = getDb();
    await deleteDoc(doc(db, DOCUMENTS, documentId));
  },

  subscribeToDocument(documentId, callback) {
    const db = getDb();
    return onSnapshot(doc(db, DOCUMENTS, documentId), (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      else callback(null);
    });
  },

  subscribeToDocumentsByDriverId(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    const q = query(
      collection(db, DOCUMENTS),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },
};

export default documentService;
