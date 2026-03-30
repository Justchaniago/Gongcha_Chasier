import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  FieldValue,
  Timestamp,
  Transaction,
  getFirestore,
} from "firebase-admin/firestore";

admin.initializeApp();

const db = getFirestore("gongcha-ver001");
const REGION = "asia-southeast2";
const CASHIER_WRITE_ROLES = ["STAFF", "SUPER_ADMIN"];

interface AdminUserData {
  name?: string;
  role?: string;
  isActive?: boolean;
  assignedStoreId?: string | null;
}

interface DailyStatUpdate {
  date: string;
  type: "STORE";
  storeId: string;
  totalRevenue?: FieldValue;
  totalTransactions: FieldValue;
  visitedMemberIds?: FieldValue;
  updatedAt: FieldValue;
}

interface CashierEarnPayload {
  receiptNumber: string;
  totalAmount: number;
  potentialPoints: number;
  uid?: string | null;
  memberId?: string;
  memberName?: string;
  storeId: string;
  storeName?: string;
}

interface CashierRedeemPayload {
  receiptNumber: string;
  storeId: string;
  storeName?: string;
  userId: string;
  memberId: string;
  memberName?: string;
  voucherCode: string;
  voucherTitle?: string;
}

interface VoucherRecord {
  code?: string;
  title?: string;
  isUsed?: boolean;
  [key: string]: unknown;
}

const buildTransactionId = (receiptNumber: string) => {
  const datePart = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const normalizedReceipt = receiptNumber.trim().replace(/\s+/g, "-");
  return `${datePart}-${normalizedReceipt}`;
};

const normalizeRole = (role?: string) => {
  if (!role) return "";
  if (["SUPER_ADMIN", "ADMIN", "MASTER", "admin", "master"].includes(role)) {
    return "SUPER_ADMIN";
  }
  if (["STAFF", "MANAGER", "manager"].includes(role)) {
    return "STAFF";
  }
  return role;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const assertPositiveAmount = (value: unknown, fieldName: string) => {
  const normalized = Number.isFinite(value) ? Math.floor(value as number) : NaN;
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} must be a positive number.`
    );
  }
  return normalized;
};

const getAdminUserRef = (uid: string) => db.collection("admin_users").doc(uid);
const getUserRef = (uid: string) => db.collection("users").doc(uid);
const getTransactionRef = (transactionId: string) =>
  db.collection("transactions").doc(transactionId);

const authorizeCashierWrite = async (
  authUid: string,
  requestedStoreId: string
) => {
  const adminSnap = await getAdminUserRef(authUid).get();
  if (!adminSnap.exists) {
    throw new HttpsError(
      "permission-denied",
      "Admin profile not found for current user."
    );
  }

  const adminData = adminSnap.data() as AdminUserData;
  if (adminData.isActive === false) {
    throw new HttpsError("permission-denied", "Staff account is inactive.");
  }

  const normalizedRole = normalizeRole(adminData.role);
  if (!CASHIER_WRITE_ROLES.includes(normalizedRole)) {
    throw new HttpsError(
      "permission-denied",
      "Current role is not allowed to submit cashier writes."
    );
  }

  const assignedStoreId = normalizeString(adminData.assignedStoreId);
  if (
    normalizedRole !== "SUPER_ADMIN" &&
    assignedStoreId !== requestedStoreId
  ) {
    throw new HttpsError(
      "permission-denied",
      "Staff can only write transactions for their assigned store."
    );
  }

  return {
    uid: authUid,
    name: normalizeString(adminData.name) || "Staff",
    role: normalizedRole,
    assignedStoreId,
  };
};

const ensureTransactionDoesNotExist = async (
  transaction: Transaction,
  transactionRef: FirebaseFirestore.DocumentReference
) => {
  const existingSnap = await transaction.get(transactionRef);
  if (existingSnap.exists) {
    throw new HttpsError(
      "already-exists",
      `Transaction ${transactionRef.id} already exists.`
    );
  }
};

const markVoucherAsUsed = (
  vouchers: VoucherRecord[],
  voucherCode: string
) => {
  let found = false;
  let alreadyUsed = false;

  const updated = vouchers.map((voucher) => {
    if (voucher.code !== voucherCode) {
      return voucher;
    }

    found = true;
    if (voucher.isUsed) {
      alreadyUsed = true;
      return voucher;
    }

    return {
      ...voucher,
      isUsed: true,
    };
  });

  return {updated, found, alreadyUsed};
};

export const recordCashierEarnTransaction = onCall<
  CashierEarnPayload
>(
  {region: REGION},
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const receiptNumber = normalizeString(request.data.receiptNumber);
    const storeId = normalizeString(request.data.storeId);
    const storeName = normalizeString(request.data.storeName) || storeId;
    const normalizedUid = normalizeString(request.data.uid) || null;
    const memberId = normalizeString(request.data.memberId) || normalizedUid;
    const memberName = normalizeString(request.data.memberName) || undefined;
    const totalAmount = assertPositiveAmount(
      request.data.totalAmount,
      "totalAmount"
    );
    const potentialPoints = Math.max(
      0,
      Number.isFinite(request.data.potentialPoints) ?
        Math.floor(request.data.potentialPoints) :
        0
    );

    if (!receiptNumber) {
      throw new HttpsError(
        "invalid-argument",
        "Receipt number is required."
      );
    }
    if (!storeId) {
      throw new HttpsError("invalid-argument", "Store id is required.");
    }

    const staff = await authorizeCashierWrite(request.auth.uid, storeId);
    const transactionId = buildTransactionId(receiptNumber);
    const transactionRef = getTransactionRef(transactionId);
    const userRef = normalizedUid ? getUserRef(normalizedUid) : null;
    const isEligibleLoyaltyEarn = Boolean(normalizedUid && potentialPoints > 0);

    await db.runTransaction(async (transaction) => {
      await ensureTransactionDoesNotExist(transaction, transactionRef);

      let nextPendingPoints: number | null = null;

      if (normalizedUid && userRef) {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
          throw new HttpsError(
            "failed-precondition",
            `User document not found for uid ${normalizedUid}.`
          );
        }

        if (isEligibleLoyaltyEarn) {
          const userData = userSnap.data() as {pendingPoints?: number};
          nextPendingPoints = (userData.pendingPoints ?? 0) + potentialPoints;
        }
      }

      transaction.set(transactionRef, {
        receiptNumber,
        posTransactionId: receiptNumber,
        totalAmount,
        potentialPoints,
        pointsEarned: potentialPoints,
        uid: normalizedUid,
        userId: normalizedUid,
        memberId,
        memberName,
        staffId: staff.uid,
        cashierName: staff.name,
        storeId,
        storeName,
        status: isEligibleLoyaltyEarn ? "PENDING" : "COMPLETED",
        type: "earn",
        pointsState: isEligibleLoyaltyEarn ? "PENDING" : "NONE",
        createdAt: FieldValue.serverTimestamp(),
      });

      if (userRef && nextPendingPoints !== null) {
        transaction.set(userRef, {
          pendingPoints: nextPendingPoints,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
      }
    });

    return {transactionId};
  }
);

export const recordCashierRedeemTransaction = onCall<
  CashierRedeemPayload
>(
  {region: REGION},
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const receiptNumber = normalizeString(request.data.receiptNumber);
    const storeId = normalizeString(request.data.storeId);
    const storeName = normalizeString(request.data.storeName) || storeId;
    const userId = normalizeString(request.data.userId);
    const memberId = normalizeString(request.data.memberId) || userId;
    const memberName = normalizeString(request.data.memberName) || undefined;
    const voucherCode = normalizeString(request.data.voucherCode);
    const fallbackVoucherTitle = normalizeString(request.data.voucherTitle);

    if (!receiptNumber) {
      throw new HttpsError(
        "invalid-argument",
        "Receipt number is required."
      );
    }
    if (!storeId) {
      throw new HttpsError("invalid-argument", "Store id is required.");
    }
    if (!userId) {
      throw new HttpsError("invalid-argument", "User id is required.");
    }
    if (!voucherCode) {
      throw new HttpsError("invalid-argument", "Voucher code is required.");
    }

    const staff = await authorizeCashierWrite(request.auth.uid, storeId);
    const transactionId = `REDEEM-${receiptNumber}`;
    const transactionRef = getTransactionRef(transactionId);
    const userRef = getUserRef(userId);

    await db.runTransaction(async (transaction) => {
      await ensureTransactionDoesNotExist(transaction, transactionRef);

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          `User document not found for uid ${userId}.`
        );
      }

      const userData = userSnap.data() as {
        name?: string;
        vouchers?: VoucherRecord[];
        activeVouchers?: VoucherRecord[];
      };

      const vouchers = Array.isArray(userData.vouchers) ?
        userData.vouchers :
        [];
      const activeVouchers = Array.isArray(userData.activeVouchers) ?
        userData.activeVouchers :
        vouchers;

      const updatedVouchersResult = markVoucherAsUsed(vouchers, voucherCode);
      const updatedActiveVouchersResult = markVoucherAsUsed(
        activeVouchers,
        voucherCode
      );

      if (!updatedVouchersResult.found && !updatedActiveVouchersResult.found) {
        throw new HttpsError(
          "not-found",
          "Voucher not found for this member."
        );
      }

      if (
        updatedVouchersResult.alreadyUsed ||
        updatedActiveVouchersResult.alreadyUsed
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Voucher has already been used."
        );
      }

      const matchedVoucher =
        vouchers.find((voucher) => voucher.code === voucherCode) ||
        activeVouchers.find((voucher) => voucher.code === voucherCode);
      const voucherTitle =
        normalizeString(matchedVoucher?.title) ||
        fallbackVoucherTitle ||
        "Voucher";
      const resolvedMemberName =
        normalizeString(userData.name) || memberName || "Pelanggan";

      transaction.set(userRef, {
        vouchers: updatedVouchersResult.updated,
        activeVouchers: updatedActiveVouchersResult.updated,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      transaction.set(transactionRef, {
        receiptNumber,
        posTransactionId: receiptNumber,
        totalAmount: 0,
        potentialPoints: 0,
        pointsEarned: 0,
        uid: userId,
        userId,
        memberId,
        memberName: resolvedMemberName,
        staffId: staff.uid,
        cashierName: staff.name,
        storeId,
        storeName,
        status: "COMPLETED",
        type: "redeem",
        pointsState: "NONE",
        voucherCode,
        voucherTitle,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {transactionId};
  }
);

export const aggregateDailyStats = onDocumentCreated(
  {
    document: "transactions/{transactionId}",
    database: "gongcha-ver001",
    region: REGION,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const trxData = snapshot.data();
    const normalizedStatus = typeof trxData.status === "string" ?
      trxData.status.toUpperCase() :
      "";
    const isCountableStatus = normalizedStatus === "COMPLETED" ||
      normalizedStatus === "PENDING" ||
      normalizedStatus === "VERIFIED";
    if (!isCountableStatus) return;
    const normalizedType = typeof trxData.type === "string" ?
      trxData.type.toUpperCase() :
      "";

    const createdAt = trxData.createdAt as Timestamp;
    if (!createdAt) return;

    const dateStr = createdAt.toDate().toISOString().split("T")[0];
    const statId = `${dateStr}-${trxData.storeId}`;
    const statRef = db.collection("daily_stats").doc(statId);

    const updates: DailyStatUpdate = {
      date: dateStr,
      type: "STORE",
      storeId: trxData.storeId,
      totalTransactions: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (normalizedType === "EARN") {
      updates.totalRevenue = FieldValue.increment(trxData.totalAmount || 0);
    }

    const relatedUid = trxData.uid || trxData.userId || trxData.memberId;
    if (relatedUid) {
      updates.visitedMemberIds = FieldValue.arrayUnion(relatedUid);
    }

    try {
      await statRef.set(updates, {merge: true});
      console.log(`[SUCCESS] Updated daily_stats ${statId}`);
    } catch (error) {
      console.error("[ERROR] Failed to update daily_stats:", error);
    }
  }
);
