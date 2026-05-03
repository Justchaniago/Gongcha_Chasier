# Backend Integration Status - Cashier App

**Objective:** Route transactions through Admin Panel Backend API for server-authoritative processing.

**Current Branch:** develope-fase1  
**Status:** IN PROGRESS  
**Last Updated:** 2026-05-03

---

## Progress Roadmap

### ✅ Step 1: Create backendApi.ts
- **Status:** COMPLETED
- **File:** `src/services/backendApi.ts`
- **Action:** Create HTTP client to Admin Panel backend
- **Target:** POST /transactions endpoint

### ✅ Step 2: Update TransactionService.ts
- **Status:** COMPLETED
- **Files:** `src/services/TransactionService.ts`
- **Action:** Replace Cloud Functions calls with backend API
- **Completed:**
  - Removed Cloud Functions imports (`httpsCallable`, `firebaseFunctions`)
  - Removed old Cloud Function callable definitions
  - Updated `recordTransactionClaim()` → calls `postTransaction()` with type='earn'
  - Updated `recordRedeemClaim()` → calls `postTransaction()` with type='redeem'
  - Updated error handling for HTTP errors

### ✅ Step 3: Fix Import
- **Status:** COMPLETED
- **File:** `src/screens/CashierDashboard.tsx`
- **Action:** Added `TransactionService` import

### ✅ Step 4: Configuration
- **Status:** COMPLETED
- **File:** `.env.local` (created)
- **Action:** Added `REACT_APP_BACKEND_URL=https://us-central1-gongcha-app-4691f.cloudfunctions.net`

### ⏳ Step 5: Testing
- **Status:** PENDING
- **Actions:**
  - Test EARN flow (scan member → amount → confirm)
  - Test REDEEM flow (scan voucher → confirm)
  - Verify activity_logs in Firestore
  - Verify backend is running + deployed

---

## Dependencies on Admin Panel

- **Backend Endpoint:** `POST /transactions` must be deployed
- **Required:** Admin Panel Cloud Functions compiled (`firebase deploy --only functions`)
- **Status:** Awaiting confirmation from Admin Panel workspace

---

## Blockers

None yet. Ready to proceed.

---

## Notes

- Cashier App uses Cloud Functions currently. Switching to HTTP API for centralization.
- Error handling will change: from Cloud Function errors to HTTP errors.
- Token handling: Firebase auth token passed in Authorization header.
