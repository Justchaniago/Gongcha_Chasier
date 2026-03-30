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

interface CashierProfile {
  staffId?: string;
  name?: string;
  passcode?: string;
  role?: "STAFF" | "MANAGER" | "ADMIN" | string;
}

interface ManageStoreStaffPayload {
  targetUid: string; // admin_users/{uid} doc uid (store document)
  action: "add" | "remove";
  cashier?: {
    staffId: string;
    name: string;
    passcode: string;
    role: "STAFF" | "MANAGER" | "ADMIN";
  };
  staffIdToRemove?: string; // required when action === "remove"
}

interface AdminUserData {
  name?: string;
  role?: string;
  isActive?: boolean;
  assignedStoreId?: string | null;
  cashiers?: CashierProfile[];
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
  staffId?: string;
  passcode?: string;
  storeId: string;
  storeName?: string;
}

interface CashierRedeemPayload {
  receiptNumber: string;
  storeId: string;
  storeName?: string;
  staffId?: string;
  passcode?: string;
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
  requestedStoreId: string,
  requestedCashierStaffId?: string,
  requestedCashierPasscode?: string
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

  const assignedStoreId = normalizeString(adminData.assignedStoreId);
  if (
    normalizeRole(adminData.role) !== "SUPER_ADMIN" &&
    assignedStoreId !== requestedStoreId
  ) {
    throw new HttpsError(
      "permission-denied",
      "Staff can only write transactions for their assigned store."
    );
  }

  const normalizedAdminRole = normalizeRole(adminData.role);

  // New model: cashiers are stored in admin_users/{uid}.cashiers.
  // If the `cashiers` field exists (even if empty), we enforce PIN validation.
  const hasCashiersArray = Array.isArray(adminData.cashiers);
  if (hasCashiersArray) {
    const cashiers = adminData.cashiers as CashierProfile[];
    const cashierStaffId = normalizeString(requestedCashierStaffId);
    const cashierPasscode = normalizeString(requestedCashierPasscode);
    if (!cashierStaffId || !cashierPasscode) {
      throw new HttpsError(
        "permission-denied",
        "Cashier staffId and passcode are required."
      );
    }

    const cashier = cashiers.find(
      (c) => normalizeString(c.staffId) === cashierStaffId
    );
    if (!cashier) {
      throw new HttpsError("permission-denied", "Cashier profile not found.");
    }

    if (normalizeString(cashier.passcode) !== cashierPasscode) {
      throw new HttpsError("permission-denied", "Invalid cashier passcode.");
    }

    const cashierRole =
      typeof cashier.role === "string" ? cashier.role.toUpperCase() : "STAFF";
    if (!["STAFF", "MANAGER", "ADMIN"].includes(cashierRole)) {
      throw new HttpsError("permission-denied", "Cashier role is not allowed.");
    }

    return {
      staffId: cashierStaffId,
      cashierName: normalizeString(cashier.name) || "Cashier",
      role: cashierRole,
      assignedStoreId,
    };
  }

  // Legacy model: admin_users/{uid} role is used directly for authorization.
  if (!CASHIER_WRITE_ROLES.includes(normalizedAdminRole)) {
    throw new HttpsError(
      "permission-denied",
      "Current role is not allowed to submit cashier writes."
    );
  }

  return {
    staffId: authUid,
    cashierName: normalizeString(adminData.name) || "Staff",
    role: normalizedAdminRole,
    assignedStoreId,
  };
};

export const manageStoreStaff = onCall<ManageStoreStaffPayload>(
  {region: REGION},
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const callerUid = request.auth.uid;
    const targetUid = normalizeString(request.data.targetUid);
    const action = request.data.action;

    if (!targetUid) {
      throw new HttpsError("invalid-argument", "targetUid is required.");
    }
    if (action !== "add" && action !== "remove") {
      throw new HttpsError("invalid-argument", "action must be add or remove.");
    }

    const callerSnap = await getAdminUserRef(callerUid).get();
    if (!callerSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "Admin profile not found for current user."
      );
    }

    const callerData = callerSnap.data() as AdminUserData;
    const callerRoleRaw =
      typeof callerData.role === "string" ? callerData.role.toUpperCase() : "";
    if (!["ADMIN", "SUPER_ADMIN"].includes(callerRoleRaw)) {
      throw new HttpsError(
        "permission-denied",
        "Only ADMIN or SUPER_ADMIN can manage store cashiers."
      );
    }

    if (callerRoleRaw !== "SUPER_ADMIN" && targetUid !== callerUid) {
      throw new HttpsError(
        "permission-denied",
        "Non-super admins can only manage their own store document."
      );
    }

    const targetRef = getAdminUserRef(targetUid);

    await db.runTransaction(async (trx) => {
      const targetSnap = await trx.get(targetRef);
      if (!targetSnap.exists) {
        throw new HttpsError("not-found", "Target store document not found.");
      }

      const targetData = targetSnap.data() as AdminUserData;
      const currentCashiers =
        Array.isArray(targetData.cashiers) ? targetData.cashiers : [];

      if (action === "add") {
        const cashier = request.data.cashier;
        if (!cashier) {
          throw new HttpsError(
            "invalid-argument",
            "cashier is required for action=add."
          );
        }

        const staffId = normalizeString(cashier.staffId);
        const name = normalizeString(cashier.name);
        const passcode = normalizeString(cashier.passcode);
        const role = cashier.role;

        if (!staffId || !name || !passcode) {
          throw new HttpsError(
            "invalid-argument",
            "cashier.staffId, cashier.name, and cashier.passcode are required."
          );
        }
        const normalizedCashierRole = String(role).toUpperCase();
        if (!["STAFF", "MANAGER", "ADMIN"].includes(normalizedCashierRole)) {
          throw new HttpsError(
            "invalid-argument",
            "cashier.role is not allowed."
          );
        }

        const filtered = currentCashiers.filter(
          (c) => normalizeString(c.staffId) !== staffId
        );
        filtered.push({
          staffId,
          name,
          passcode,
          role: String(role).toUpperCase(),
        });

        trx.set(targetRef, {cashiers: filtered}, {merge: true});
      } else {
        const staffIdToRemove = normalizeString(request.data.staffIdToRemove);
        if (!staffIdToRemove) {
          throw new HttpsError(
            "invalid-argument",
            "staffIdToRemove is required for action=remove."
          );
        }

        const filtered = currentCashiers.filter(
          (c) => normalizeString(c.staffId) !== staffIdToRemove
        );

        trx.set(targetRef, {cashiers: filtered}, {merge: true});
      }
    });

    return {ok: true};
  }
);

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

    const cashier = await authorizeCashierWrite(
      request.auth.uid,
      storeId,
      request.data.staffId,
      request.data.passcode
    );
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
        staffId: cashier.staffId,
        cashierName: cashier.cashierName,
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

    const cashier = await authorizeCashierWrite(
      request.auth.uid,
      storeId,
      request.data.staffId,
      request.data.passcode
    );
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
        staffId: cashier.staffId,
        cashierName: cashier.cashierName,
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
