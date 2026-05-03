import { getAuth } from 'firebase/auth';

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

export async function postTransaction(
  data: TransactionRequest
): Promise<TransactionResponse> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();

    console.log('[backendApi] Calling:', `${BACKEND_URL}/transactions`);
    console.log('[backendApi] Token length:', idToken.length);
    console.log('[backendApi] Payload:', data);

    const response = await fetch(`${BACKEND_URL}/transactions`, {
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
  } catch (error) {
    console.error('Backend API error:', error);
    throw error;
  }
}
