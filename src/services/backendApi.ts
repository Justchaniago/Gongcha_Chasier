import { getAuth } from 'firebase/auth';
import { enqueueTransaction } from './offlineQueue';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  'https://us-central1-gongcha-app-4691f.cloudfunctions.net';

export interface TransactionRequest {
  receiptNumber: string;
  storeId: string;
  storeName: string;
  memberId?: string;
  memberName?: string;
  staffId: string;
  totalAmount: number;
  type: 'earn' | 'redeem';
  voucherCode?: string;
  voucherTitle?: string;
}

export interface TransactionResponse {
  success: boolean;
  transactionId?: string;
  pointsEarned?: number;
  newBalance?: number;
  newTier?: string;
  error?: string;
  code?: string;
}

export type TransactionResult =
  | TransactionResponse
  | { queued: true; localId: string };

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Don't retry 4xx — those are caller errors (bad data, auth, etc.)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 5xx — retry
      if (attempt < retries - 1) {
        const backoffMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(`[backendApi] Attempt ${attempt + 1} failed (${response.status}), retrying in ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
      } else {
        return response;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      const label = isTimeout ? 'timeout' : 'network error';

      if (attempt < retries - 1) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        console.warn(`[backendApi] Attempt ${attempt + 1} ${label}, retrying in ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
      } else {
        throw new Error(isTimeout ? 'Request timed out. Periksa koneksi internet.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
      }
    }
  }

  // Unreachable — TypeScript guard
  throw new Error('fetchWithRetry: unexpected exit');
}

const NETWORK_ERROR_RE = /timed out|koneksi internet|terhubung ke server/i;

// Safe wrapper — queues to AsyncStorage on network failure instead of throwing
export async function postTransactionWithFallback(
  data: TransactionRequest
): Promise<TransactionResult> {
  try {
    return await postTransaction(data);
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    // Only queue network/timeout failures — 4xx (bad data, auth) should surface immediately
    if (NETWORK_ERROR_RE.test(msg)) {
      const localId = await enqueueTransaction(data);
      console.log(`[backendApi] Network failure — queued as ${localId}`);
      return { queued: true, localId };
    }
    throw err;
  }
}

export async function postTransaction(
  data: TransactionRequest
): Promise<TransactionResponse> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const idToken = await user.getIdToken();

  console.log('[backendApi] Calling:', `${BACKEND_URL}/transactions`);
  console.log('[backendApi] Firebase Auth UID (token owner):', user.uid);
  console.log('[backendApi] Payload:', data);

  const response = await fetchWithRetry(`${BACKEND_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  console.log('[backendApi] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorMsg = `Backend error (${response.status})`;

    try {
      if (contentType?.includes('application/json')) {
        const errorBody = await response.json();
        console.log('[backendApi] Error body:', JSON.stringify(errorBody));
        errorMsg = errorBody.error || errorBody.message || errorMsg;
      } else {
        const text = await response.text();
        console.log('[backendApi] Error body (text):', text.substring(0, 200));
        errorMsg = `Backend error (${response.status}): ${response.statusText}`;
      }
    } catch (e) {
      errorMsg = `Backend error (${response.status}): ${response.statusText}`;
    }

    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch (e) {
    console.error('Failed to parse response JSON:', e);
    throw new Error('Invalid response from backend');
  }
}
