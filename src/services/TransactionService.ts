import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import { TransactionRecord } from '../types/types';
import { postTransaction, TransactionRequest } from './backendApi';

const buildEarnTransactionError = (error: any, receiptNumber: string) => {
  const msg = error instanceof Error ? error.message : String(error);

  if (/duplicate|already exists/i.test(msg)) {
    return {
      shouldLogAsError: false,
      message: `Transaksi dengan ID ${receiptNumber} sudah pernah diinput. Cek riwayat transaksi sebelum input ulang.`,
    };
  }

  if (/not authenticated|permission|unauthorized/i.test(msg)) {
    return {
      shouldLogAsError: false,
      message: 'Sesi kasir tidak valid. Pilih kasir yang benar lalu login ulang PIN kasir.',
    };
  }

  return {
    shouldLogAsError: true,
    message: msg || 'Gagal mencatat transaksi. Silakan coba lagi.',
  };
};

const buildRedeemTransactionError = (error: any, voucherCode: string) => {
  const msg = error instanceof Error ? error.message : String(error);

  if (/already|duplicate/i.test(msg)) {
    return {
      shouldLogAsError: false,
      message: `Redeem untuk voucher ${voucherCode} sudah pernah dicatat sebelumnya.`,
    };
  }

  if (/already been used/i.test(msg)) {
    return {
      shouldLogAsError: false,
      message: `Voucher ${voucherCode} sudah pernah digunakan sebelumnya.`,
    };
  }

  return {
    shouldLogAsError: true,
    message: msg || 'Gagal mencatat redeem voucher. Silakan coba lagi.',
  };
};

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
    passcode: string;
    cashierName?: string;
    storeId: string;
    storeName: string;
  }) {
    try {
      const payload: TransactionRequest = {
        receiptNumber: data.receiptNumber.trim(),
        totalAmount: data.totalAmount,
        memberId: data.memberId?.trim(),
        memberName: data.memberName?.trim(),
        staffId: data.staffId.trim(),
        storeId: data.storeId.trim(),
        storeName: data.storeName.trim(),
        type: 'earn',
      };

      const result = await postTransaction(payload);

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      return result.transactionId;
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
    passcode: string;
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
      const payload: TransactionRequest = {
        receiptNumber: data.receiptNumber.trim(),
        storeId: data.storeId.trim(),
        storeName: data.storeName.trim(),
        staffId: data.staffId.trim(),
        memberId: data.memberId.trim(),
        memberName: data.memberName.trim(),
        type: 'redeem',
        voucherCode: data.voucherCode.trim(),
        voucherTitle: data.voucherTitle.trim(),
        totalAmount: 0,
      };

      const result = await postTransaction(payload);

      if (!result.success) {
        throw new Error(result.error || 'Redeem failed');
      }

      return result.transactionId;
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
