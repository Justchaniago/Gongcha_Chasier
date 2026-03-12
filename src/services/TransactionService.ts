import { 
  doc, 
  setDoc, 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import { TransactionRecord } from '../types/types';

export const TransactionService = {
  /**
   * MENCATAT TRANSAKSI EARN POIN (POV KASIR)
   * Hanya menulis ke root collection 'transactions'.
   * Update riwayat ke dokumen user DIHAPUS demi efisiensi baca/tulis data.
   */
  async recordTransactionClaim(data: {
    receiptNumber: string;
    totalAmount: number;
    potentialPoints: number;
    userId: string | null;
    memberId?: string;
    memberName?: string;
    staffId: string;
    storeId: string;
    storeName: string;
  }) {
    try {
      const now = new Date();
      // Membuat ID custom yang pintar untuk dokumen: YYYYMMDD-ReceiptNumber
      const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
      const smartId = `${datePart}-${data.receiptNumber}`;

      const trxDocRef = doc(firestoreDb, "transactions", smartId);

      const trxPayload: TransactionRecord = {
        receiptNumber: data.receiptNumber,
        totalAmount: data.totalAmount,
        potentialPoints: data.potentialPoints,
        userId: data.userId,
        memberId: data.memberId,
        memberName: data.memberName,
        staffId: data.staffId,
        storeId: data.storeId,
        storeName: data.storeName,
        status: 'COMPLETED', // Status standar saat kasir menyelesaikan transaksi
        type: 'earn',
        createdAt: serverTimestamp(),
      };

      // Eksekusi Simpan Global
      await setDoc(trxDocRef, trxPayload);

      return smartId;
    } catch (error) {
      console.error("Transaction Error:", error);
      throw error;
    }
  },

  /**
   * MENCATAT TRANSAKSI REDEEM VOUCHER (POV KASIR)
   */
  async recordRedeemClaim(data: {
    receiptNumber: string;
    staffId: string;
    storeId: string;
    storeName: string;
    userId: string;
    memberId: string;
    memberName: string;
    voucherCode: string;
    voucherTitle: string;
  }) {
    try {
      const smartId = `REDEEM-${data.receiptNumber}`;
      const trxDocRef = doc(firestoreDb, "transactions", smartId);

      const trxPayload: TransactionRecord = {
        receiptNumber: data.receiptNumber,
        totalAmount: 0,
        potentialPoints: 0,
        userId: data.userId,
        memberId: data.memberId,
        memberName: data.memberName,
        staffId: data.staffId,
        storeId: data.storeId,
        storeName: data.storeName,
        status: 'COMPLETED',
        type: 'redeem',
        voucherCode: data.voucherCode,
        voucherTitle: data.voucherTitle,
        createdAt: serverTimestamp(),
      };

      await setDoc(trxDocRef, trxPayload);
      return smartId;
    } catch (error) {
      console.error("Redeem Transaction Error:", error);
      throw error;
    }
  },

  /**
   * MENGAMBIL HISTORI TRANSAKSI HARI INI
   * Digunakan untuk dashboard kasir
   */
  async getStoreHistory(storeId: string) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // Query history menggunakan storeId (Lebih aman dari typo nama lokasi)
      const q = query(
        collection(firestoreDb, "transactions"),
        where("storeId", "==", storeId),
        where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
        orderBy("createdAt", "desc")
      );
      
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() as TransactionRecord }));
    } catch (error) {
      console.error("Fetch Store History Error:", error);
      return [];
    }
  }
};