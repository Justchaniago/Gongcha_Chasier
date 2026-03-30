import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestoreDb, firebaseFunctions } from '../config/firebase';
import { TransactionRecord } from '../types/types';

const getErrorCode = (error: any) =>
  typeof error?.code === 'string' ? error.code.replace(/^functions\//, '') : '';

const getErrorMessage = (error: any) =>
  typeof error?.message === 'string' ? error.message : '';

const buildEarnTransactionError = (error: any, receiptNumber: string) => {
  const code = getErrorCode(error);
  const rawMessage = getErrorMessage(error);

  if (code === 'already-exists' || /already exists/i.test(rawMessage)) {
    return {
      shouldLogAsError: false,
      message: `Transaksi dengan ID ${receiptNumber} sudah pernah diinput. Cek riwayat transaksi sebelum input ulang.`,
    };
  }

  if (code === 'permission-denied') {
    return {
      shouldLogAsError: false,
      message: 'Akun kasir ini belum punya izin untuk mencatat transaksi di store ini.',
    };
  }

  return {
    shouldLogAsError: true,
    message: rawMessage || 'Gagal mencatat transaksi. Silakan coba lagi.',
  };
};

const buildRedeemTransactionError = (error: any, voucherCode: string) => {
  const code = getErrorCode(error);
  const rawMessage = getErrorMessage(error);

  if (code === 'already-exists' || /already exists/i.test(rawMessage)) {
    return {
      shouldLogAsError: false,
      message: `Redeem untuk voucher ${voucherCode} sudah pernah dicatat sebelumnya.`,
    };
  }

  if (code === 'failed-precondition' && /already been used/i.test(rawMessage)) {
    return {
      shouldLogAsError: false,
      message: `Voucher ${voucherCode} sudah pernah digunakan sebelumnya.`,
    };
  }

  return {
    shouldLogAsError: true,
    message: rawMessage || 'Gagal mencatat redeem voucher. Silakan coba lagi.',
  };
};

const recordCashierEarnTransaction = httpsCallable<
  {
    receiptNumber: string;
    totalAmount: number;
    potentialPoints: number;
    uid: string | null;
    memberId?: string;
    memberName?: string;
    storeId: string;
    storeName: string;
  },
  { transactionId: string }
>(firebaseFunctions, 'recordCashierEarnTransaction');

const recordCashierRedeemTransaction = httpsCallable<
  {
    receiptNumber: string;
    storeId: string;
    storeName: string;
    userId: string;
    memberId: string;
    memberName: string;
    voucherCode: string;
    voucherTitle: string;
  },
  { transactionId: string }
>(firebaseFunctions, 'recordCashierRedeemTransaction');

export const TransactionService = {
  async hasTodayReceipt(storeId: string, receiptNumber: string) {
    const normalizedReceipt = receiptNumber.trim();
    if (!storeId.trim() || !normalizedReceipt) {
      return false;
    }

    const history = await this.getStoreHistory(storeId.trim());
    return history.some((transaction) => {
      const existingReceipt = transaction.posTransactionId || transaction.receiptNumber;
      return existingReceipt === normalizedReceipt;
    });
  },

  async recordTransactionClaim(data: {
    receiptNumber: string;
    totalAmount: number;
    potentialPoints: number;
    uid: string | null;
    memberId?: string;
    memberName?: string;
    staffId: string;
    cashierName?: string;
    storeId: string;
    storeName: string;
  }) {
    try {
      const payload = {
        receiptNumber: data.receiptNumber.trim(),
        totalAmount: data.totalAmount,
        potentialPoints: data.potentialPoints,
        uid: data.uid?.trim() || null,
        memberId: data.memberId?.trim() || undefined,
        memberName: data.memberName?.trim() || undefined,
        storeId: data.storeId.trim(),
        storeName: data.storeName.trim(),
      };

      const result = await recordCashierEarnTransaction(payload);
      return result.data.transactionId;
    } catch (error) {
      const handled = buildEarnTransactionError(error, data.receiptNumber.trim());
      if (handled.shouldLogAsError) {
        console.error('[TransactionService] Earn transaction failed:', error);
      } else {
        console.info('[TransactionService] Earn transaction blocked:', handled.message);
      }
      throw new Error(handled.message);
    }
  },

  async recordRedeemClaim(data: {
    receiptNumber: string;
    staffId: string;
    cashierName?: string;
    storeId: string;
    storeName: string;
    userId: string;
    memberId: string;
    memberName: string;
    voucherCode: string;
    voucherTitle: string;
  }) {
    try {
      const payload = {
        receiptNumber: data.receiptNumber.trim(),
        storeId: data.storeId.trim(),
        storeName: data.storeName.trim(),
        userId: data.userId.trim(),
        memberId: data.memberId.trim(),
        memberName: data.memberName.trim(),
        voucherCode: data.voucherCode.trim(),
        voucherTitle: data.voucherTitle.trim(),
      };

      const result = await recordCashierRedeemTransaction(payload);
      return result.data.transactionId;
    } catch (error) {
      const handled = buildRedeemTransactionError(error, data.voucherCode.trim());
      if (handled.shouldLogAsError) {
        console.error('[TransactionService] Redeem transaction failed:', error);
      } else {
        console.info('[TransactionService] Redeem transaction blocked:', handled.message);
      }
      throw new Error(handled.message);
    }
  },

  async getStoreHistory(storeId: string) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const q = query(
        collection(firestoreDb, 'transactions'),
        where('storeId', '==', storeId),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        orderBy('createdAt', 'desc')
      );

      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() as TransactionRecord }));
    } catch (error) {
      console.error('Fetch Store History Error:', error);
      return [];
    }
  }
};
