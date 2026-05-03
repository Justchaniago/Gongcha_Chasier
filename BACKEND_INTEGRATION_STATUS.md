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

## Next Steps

### ⏳ Create .env.local (Manual)
`.env.local` is not committed (in .gitignore). Create manually:
```bash
REACT_APP_BACKEND_URL=https://us-central1-gongcha-app-4691f.cloudfunctions.net
```

For local dev (Admin Panel emulator):
```bash
REACT_APP_BACKEND_URL=http://localhost:5001/gongcha-app-4691f/us-central1
```

### ⏳ Verify Admin Panel Backend
- Backend must be deployed: `cd gongcha-adminnew/functions && npm run build && firebase deploy --only functions`
- Check that `/transactions` endpoint is available
- Verify auth middleware validates Firebase tokens

### ⏳ Run Cashier App Tests
- Run: `npm start`
- Test EARN flow: scan member → enter amount → confirm
- Test REDEEM flow: scan voucher → confirm
- Check Firestore `activity_logs` collection for transaction entries

---

## Code Changes Summary

### src/services/backendApi.ts (NEW)
- HTTP client for Admin Panel `/transactions` endpoint
- Handles Firebase auth token injection
- Typed request/response interfaces

### src/services/TransactionService.ts (MODIFIED)
- Removed `httpsCallable` imports
- Removed Cloud Function definitions
- Updated `recordTransactionClaim()` → `postTransaction()` (earn)
- Updated `recordRedeemClaim()` → `postTransaction()` (redeem)
- Simplified error handling for HTTP errors

### src/screens/CashierDashboard.tsx (MODIFIED)
- Added `TransactionService` import

---

## Blockers

None. Code compiles. Ready for Admin Panel backend to be deployed.

---

## Notes

- Cashier App now routes ALL transactions through Admin Panel backend
- Error handling adapted from Cloud Function errors to HTTP errors
- Firebase token passed in Authorization header for auth
- Backend must validate staff permissions (passcode validation moved to backend)
- Voucher atomicity guaranteed by backend (no local updates needed)
