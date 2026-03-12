import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import { TransactionRecord, XpRecord } from '../types/types';

export const TransactionService = {
  /**
   * MENCATAT TRANSAKSI (POV KASIR)
   * Menulis langsung ke root collection 'transactions' agar terbaca di Admin Panel
   */
  async recordTransactionClaim(data: {
    transactionId: string,
    amount: number,
    memberId: string,
    memberName: string,
    staffId: string,
    storeLocation: string // Menerima single string
  }) {
    try {
      const now = new Date();
      const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
      const smartId = `${datePart}-${data.transactionId}`;

      // 1. Path Koleksi Global Transactions
      const trxDocRef = doc(firestoreDb, "transactions", smartId);

      const trxPayload: TransactionRecord = {
        transactionId: data.transactionId,
        amount: data.amount,
        potentialPoints: Math.floor(data.amount / 100), // Asumsi rasio poin
        memberId: data.memberId,
        memberName: data.memberName,
        staffId: data.staffId,
        storeLocation: data.storeLocation,
        status: 'pending', // Huruf kecil mutlak
        type: 'earn',      // Huruf kecil mutlak
        createdAt: serverTimestamp(),
      };

      // 2. Data Riwayat untuk Profil User
      const userHistoryItem: XpRecord = {
        id: smartId,
        date: now.toISOString(),
        amount: trxPayload.potentialPoints,
        type: 'earn',
        context: `Purchase at ${data.storeLocation}`,
        location: data.storeLocation,
        transactionId: data.transactionId
      };

      const userDocRef = doc(firestoreDb, 'users', data.memberId);

      // 3. Eksekusi Simpan Global
      await Promise.all([
        setDoc(trxDocRef, trxPayload),
        updateDoc(userDocRef, {
          xpHistory: arrayUnion(userHistoryItem)
        })
      ]);

      return smartId;
    } catch (error) {
      console.error("Transaction Error:", error);
      throw error;
    }
  },

  // Mengambil histori dari root collection khusus toko tertentu
  async getStoreHistory(storeLocation: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(firestoreDb, "transactions"),
      where("storeLocation", "==", storeLocation),
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};