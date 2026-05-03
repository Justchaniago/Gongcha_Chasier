import {
  buildLedgerEntryData,
  buildLedgerId,
  createLedgerEntry,
  getPointsLedgerRef,
  updateLedgerStatus,
} from "./ledgerService.js";

interface FakeSnapshot {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
}

interface RecordedCall {
  kind: "create" | "set";
  path: string;
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
}

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectThrowsAsync = async (
  action: () => Promise<unknown>,
  expectedMessage: string
) => {
  try {
    await action();
    throw new Error(`Expected error containing: ${expectedMessage}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessage),
      `Expected "${message}" to include "${expectedMessage}"`
    );
  }
};

const createFakeSnapshot = (
  exists: boolean,
  data?: Record<string, unknown>
): FakeSnapshot => ({
  exists,
  data: () => data,
});

const createFakeLedgerRef = (path: string) => ({
  id: path.split("/").pop() || path,
  path,
} as FirebaseFirestore.DocumentReference);

const createFakeDb = () => ({
  collection: (_name: string) => ({
    doc: (ledgerId: string) =>
      createFakeLedgerRef(`points_ledger/${ledgerId}`),
  }),
} as FirebaseFirestore.Firestore);

const createFakeTransaction = (
  snapshots: Record<string, FakeSnapshot> = {}
) => {
  const calls: RecordedCall[] = [];
  const transaction = {
    get: async (documentRef: FirebaseFirestore.DocumentReference) =>
      snapshots[documentRef.path] || createFakeSnapshot(false),
    create: (
      documentRef: FirebaseFirestore.DocumentReference,
      data: FirebaseFirestore.DocumentData
    ) => {
      calls.push({kind: "create", path: documentRef.path, data});
      snapshots[documentRef.path] = createFakeSnapshot(
        true,
        data as Record<string, unknown>
      );
      return transaction;
    },
    set: (
      documentRef: FirebaseFirestore.DocumentReference,
      data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
      options?: FirebaseFirestore.SetOptions
    ) => {
      calls.push({
        kind: "set",
        path: documentRef.path,
        data: data as Record<string, unknown>,
        options: options as Record<string, unknown> | undefined,
      });
      const previousData = snapshots[documentRef.path]?.data() || {};
      snapshots[documentRef.path] = createFakeSnapshot(true, {
        ...previousData,
        ...(data as Record<string, unknown>),
      });
      return transaction;
    },
  };

  return {transaction, calls, snapshots};
};

export const testLedgerIdAlwaysDeterministic = () => {
  const ledgerId = buildLedgerId("20260408-RCPT-001", "EARN");
  assert(
    ledgerId === "20260408-RCPT-001_EARN",
    "ledgerId should be deterministic"
  );
};

export const testDuplicateTransactionRetryCreatesOnlyOneLedgerEntry = async () => {
  const db = createFakeDb();
  const {transaction, calls} = createFakeTransaction();

  const firstResult = await createLedgerEntry(transaction, db, {
    userId: "user-1",
    type: "EARN",
    points: 25,
    direction: "IN",
    source: "cashier",
    refId: "20260408-RCPT-001",
    status: "PENDING",
  });
  const secondResult = await createLedgerEntry(transaction, db, {
    userId: "user-1",
    type: "EARN",
    points: 25,
    direction: "IN",
    source: "cashier",
    refId: "20260408-RCPT-001",
    status: "PENDING",
  });

  assert(firstResult.ledgerId === secondResult.ledgerId, "ledgerId must match");
  assert(calls.filter((call) => call.kind === "create").length === 1, "only one ledger create is allowed");
};

export const testInvalidPointsThrows = async () => {
  await expectThrowsAsync(async () => {
    buildLedgerEntryData({
      userId: "user-1",
      type: "EARN",
      points: 0,
      direction: "IN",
      source: "cashier",
      refId: "20260408-RCPT-001",
      status: "PENDING",
    });
  }, "points must be a positive integer");
};

export const testInvalidStatusTransitionThrows = async () => {
  const ledgerRef = createFakeLedgerRef("points_ledger/20260408-RCPT-001_EARN");
  const {transaction} = createFakeTransaction({
    [ledgerRef.path]: createFakeSnapshot(true, {status: "COMPLETED"}),
  });

  await expectThrowsAsync(async () => {
    await updateLedgerStatus(transaction, ledgerRef, "CANCELLED");
  }, "Invalid ledger status transition");
};

export const testRedeemCreatesCompletedOutLedger = async () => {
  const db = createFakeDb();
  const {transaction} = createFakeTransaction();
  const result = await createLedgerEntry(transaction, db, {
    userId: "user-1",
    type: "REDEEM",
    points: 50,
    direction: "OUT",
    source: "cashier",
    refId: "REDEEM-RCPT-001",
    status: "COMPLETED",
    metadata: {voucherCode: "VCR-001"},
  });
  const createdRef = getPointsLedgerRef(db, result.ledgerId);

  assert(createdRef.path === "points_ledger/REDEEM-RCPT-001_REDEEM", "redeem ledger path should be deterministic");
};
