import {FieldValue} from "firebase-admin/firestore";

export type PointsLedgerType = "EARN" | "REDEEM" | "ADJUSTMENT";
export type PointsLedgerDirection = "IN" | "OUT";
export type PointsLedgerSource = "cashier" | "admin" | "system";
export type PointsLedgerStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface LedgerMetadata {
  [key: string]: unknown;
}

export interface PointsLedgerEntryInput {
  userId: string;
  type: PointsLedgerType;
  points: number;
  direction: PointsLedgerDirection;
  source: PointsLedgerSource;
  refId: string;
  status: PointsLedgerStatus;
  metadata?: LedgerMetadata;
}

export interface CreateLedgerEntryResult {
  ledgerId: string;
  ledgerRef: FirebaseFirestore.DocumentReference;
  alreadyExisted: boolean;
}

interface TransactionLike {
  get: (
    documentRef: FirebaseFirestore.DocumentReference
  ) => Promise<{
    exists: boolean;
    data: () => FirebaseFirestore.DocumentData | undefined;
  }>;
  create: (
    documentRef: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData
  ) => TransactionLike;
  set: (
    documentRef: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
    options?: FirebaseFirestore.SetOptions
  ) => TransactionLike;
}

const LEDGER_TYPES: PointsLedgerType[] = ["EARN", "REDEEM", "ADJUSTMENT"];
const STATUS_TRANSITIONS: Record<PointsLedgerStatus, PointsLedgerStatus[]> = {
  PENDING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const normalizeRequiredString = (value: string, fieldName: string) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required for ledger entry.`);
  }
  return normalized;
};

const assertPositiveInteger = (value: number, fieldName: string) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
};

const assertValidType = (type: PointsLedgerType) => {
  if (!LEDGER_TYPES.includes(type)) {
    throw new Error(`Invalid ledger type ${type}.`);
  }
};

const assertDirectionMatchesType = (
  type: PointsLedgerType,
  direction: PointsLedgerDirection
) => {
  if (type === "EARN" && direction !== "IN") {
    throw new Error("Ledger direction must be IN for EARN.");
  }
  if (type === "REDEEM" && direction !== "OUT") {
    throw new Error("Ledger direction must be OUT for REDEEM.");
  }
};

export const buildLedgerId = (
  refId: string,
  type: PointsLedgerType
) => `${normalizeRequiredString(refId, "refId")}_${type}`;

export const getPointsLedgerRef = (
  db: FirebaseFirestore.Firestore,
  ledgerId: string
) => db.collection("points_ledger").doc(ledgerId);

export const buildLedgerEntryData = (
  entry: PointsLedgerEntryInput
): FirebaseFirestore.DocumentData => {
  const userId = normalizeRequiredString(entry.userId, "userId");
  const refId = normalizeRequiredString(entry.refId, "refId");

  assertPositiveInteger(entry.points, "points");
  assertValidType(entry.type);
  assertDirectionMatchesType(entry.type, entry.direction);

  const data: FirebaseFirestore.DocumentData = {
    userId,
    type: entry.type,
    points: entry.points,
    direction: entry.direction,
    source: entry.source,
    refId,
    status: entry.status,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    data.metadata = entry.metadata;
  }

  return data;
};

export const createLedgerEntry = async (
  transaction: TransactionLike,
  db: FirebaseFirestore.Firestore,
  entry: PointsLedgerEntryInput
): Promise<CreateLedgerEntryResult> => {
  const data = buildLedgerEntryData(entry);
  const ledgerId = buildLedgerId(entry.refId, entry.type);
  const ledgerRef = getPointsLedgerRef(db, ledgerId);

  try {
    const ledgerSnap = await transaction.get(ledgerRef);
    if (ledgerSnap.exists) {
      return {
        ledgerId,
        ledgerRef,
        alreadyExisted: true,
      };
    }

    transaction.create(ledgerRef, data);
    return {
      ledgerId,
      ledgerRef,
      alreadyExisted: false,
    };
  } catch (error) {
    console.error("LedgerError", {
      action: "createLedgerEntry",
      ledgerId,
      refId: entry.refId,
      type: entry.type,
      userId: entry.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const updateLedgerStatus = async (
  transaction: TransactionLike,
  ledgerRef: FirebaseFirestore.DocumentReference,
  status: PointsLedgerStatus
) => {
  try {
    const ledgerSnap = await transaction.get(ledgerRef);
    if (!ledgerSnap.exists) {
      throw new Error(`Ledger ${ledgerRef.id} not found.`);
    }

    const ledgerData = ledgerSnap.data() as {status?: PointsLedgerStatus};
    const currentStatus = ledgerData.status;
    if (!currentStatus || !(currentStatus in STATUS_TRANSITIONS)) {
      throw new Error(`Ledger ${ledgerRef.id} has invalid current status.`);
    }

    const allowedStatuses = STATUS_TRANSITIONS[currentStatus];
    if (!allowedStatuses.includes(status)) {
      throw new Error(
        `Invalid ledger status transition ${currentStatus} -> ${status}.`
      );
    }

    transaction.set(ledgerRef, {status}, {merge: true});
  } catch (error) {
    console.error("LedgerError", {
      action: "updateLedgerStatus",
      ledgerId: ledgerRef.id,
      nextStatus: status,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
