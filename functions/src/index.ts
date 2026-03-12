import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {FieldValue, Timestamp} from "firebase-admin/firestore";

import path from "path";
import fs from "fs";

const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Definisi Interface untuk menghindari penggunaan 'any'
interface DailyStatUpdate {
  date: string;
  type: "STORE";
  storeId: string;
  totalRevenue?: FieldValue;
  totalTransactions: FieldValue;
  visitedMemberIds?: FieldValue;
  updatedAt: FieldValue;
}

export const aggregateDailyStats = onDocumentCreated(
  "gongcha-ver001/transactions/{transactionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const trxData = snapshot.data();
    if (trxData.status !== "COMPLETED") return;

    const createdAt = trxData.createdAt as Timestamp;
    if (!createdAt) return;

    const dateStr = createdAt.toDate().toISOString().split("T")[0];
    const statId = `${dateStr}-${trxData.storeId}`;
    const statRef = db.collection("daily_stats").doc(statId);

    // Gunakan interface DailyStatUpdate alih-alih 'any'
    const updates: DailyStatUpdate = {
      date: dateStr,
      type: "STORE",
      storeId: trxData.storeId,
      totalTransactions: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (trxData.type === "earn") {
      updates.totalRevenue = FieldValue.increment(trxData.totalAmount || 0);
    }

    if (trxData.userId) {
      updates.visitedMemberIds = FieldValue.arrayUnion(trxData.userId);
    }

    try {
      await statRef.set(updates, {merge: true});
      console.log(`[SUCCESS] Updated daily_stats ${statId}`);
    } catch (error) {
      console.error("[ERROR] Failed to update daily_stats:", error);
    }
  }
);
