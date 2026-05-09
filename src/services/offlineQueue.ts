import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionRequest, TransactionResponse } from './backendApi';

const QUEUE_KEY = '@gongcha_offline_queue';

export interface QueuedTransaction {
  localId: string;
  data: TransactionRequest;
  queuedAt: string;
}

export async function enqueueTransaction(data: TransactionRequest): Promise<string> {
  const localId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: QueuedTransaction = { localId, data, queuedAt: new Date().toISOString() };

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedTransaction[] = raw ? JSON.parse(raw) : [];
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  console.log(`[offlineQueue] Enqueued ${localId} (queue size: ${queue.length})`);
  return localId;
}

export async function getQueue(): Promise<QueuedTransaction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeFromQueue(localId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedTransaction[] = raw ? JSON.parse(raw) : [];
  const filtered = queue.filter(item => item.localId !== localId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// poster = postTransaction from backendApi — passed in to avoid circular dep
export async function flushQueue(
  poster: (data: TransactionRequest) => Promise<TransactionResponse>
): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[offlineQueue] Flushing ${queue.length} queued transactions`);

  for (const item of queue) {
    try {
      const result = await poster(item.data);
      if (result.success) {
        await removeFromQueue(item.localId);
        console.log(`[offlineQueue] Flushed ${item.localId} → txId: ${result.transactionId}`);
      } else {
        // Backend rejected (e.g. duplicate receipt) — remove to avoid infinite retry
        console.warn(`[offlineQueue] Backend rejected ${item.localId}: ${result.error}`);
        await removeFromQueue(item.localId);
      }
    } catch (err: any) {
      // Still offline or auth error — stop flush, retry next time app becomes active
      console.warn(`[offlineQueue] Flush failed for ${item.localId}, will retry later:`, err?.message);
      break;
    }
  }
}
