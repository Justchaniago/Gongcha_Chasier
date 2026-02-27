import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
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
import { TransactionRecord, XpRecord, UserProfile } from '../types/types';

export const TransactionService = {
  /**
   * MENCATAT TRANSAKSI (POV KASIR)
   * Mengisi sub-koleksi: stores/{storeId}/transactions/{SmartID}
   */
  async recordTransactionClaim(data: {
    transactionId: string,
    amount: number,
    memberId: string,
    memberName: string,
    staffId: string,
    storeLocation: string
  }) {
    try {
      const now = new Date();
      const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
      const smartId = `${datePart}-${data.transactionId}`;

      // 1. Path Sub-koleksi Store
      const trxDocRef = doc(firestoreDb, "stores", data.storeLocation, "transactions", smartId);

      const trxPayload: TransactionRecord = {
        transactionId: data.transactionId,
        amount: data.amount,
        potentialPoints: Math.floor(data.amount / 100),
        memberId: data.memberId,
        memberName: data.memberName,
        staffId: data.staffId,
        storeLocation: data.storeLocation,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      // 2. Data Riwayat untuk User
      const userHistoryItem: XpRecord = {
        id: smartId,
        date: now.toISOString(),
        amount: trxPayload.potentialPoints,
        type: 'earn',
        status: 'pending',
        context: `Purchase at ${data.storeLocation}`,
        location: data.storeLocation,
        transactionId: data.transactionId
      };

      const userDocRef = doc(firestoreDb, 'users', data.memberId);

      // 3. Eksekusi Simpan (Double Write)
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

  async getStoreHistory(storeId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(firestoreDb, "stores", storeId, "transactions"),
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};