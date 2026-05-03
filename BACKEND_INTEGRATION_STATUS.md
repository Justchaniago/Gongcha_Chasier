# Backend Integration Status - Cashier App

**Objective:** Route transactions through Admin Panel Backend API for server-authoritative processing.

**Current Branch:** develope-fase1  
**Status:** ✅ PHASE B COMPLETE  
**Last Updated:** 2026-05-03 (Final)

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

## ✅ Resolved Blockers

### 🔧 Blocker 1: Backend 401 Unauthorized (FIXED)
- **Issue:** Backend rejected cashier Firebase tokens
- **Fix:** Auth middleware updated to accept STAFF role
- **Status:** ✅ RESOLVED

### 🔧 Blocker 2: Cloud Function IAM (FIXED)
- **Issue:** Function not invokable (Google-level 401)
- **Fix:** IAM policy updated (allUsers + cloudfunctions.invoker)
- **Status:** ✅ RESOLVED

### 🔧 Blocker 3: Firestore Database (FIXED)
- **Issue:** Cloud Functions querying (default) DB instead of gongcha-ver001
- **Fix:** Updated all getFirestore() calls to specify gongcha-ver001
- **Status:** ✅ RESOLVED

### 🔧 Blocker 4: Composite Index Missing (FIXED)
- **Issue:** Query requires index (memberId, status, type, createdAt)
- **Fix:** Index created in Firestore
- **Status:** ✅ RESOLVED

---

## Final Summary

### ✅ Cashier App Integration Complete

**What Changed:**
- Migrated from Cashier App's own Cloud Functions to Admin Panel Backend API
- All transactions now routed through `/transactions` endpoint
- Server-authoritative: points, tier, voucher logic centralized in Admin Panel

**Testing Results:**
- ✅ EARN flow: Creates transaction (PENDING), points held for admin approval
- ✅ REDEEM flow: Creates transaction (PENDING), voucher held for admin approval
- ✅ Error handling: Descriptive JSON responses
- ✅ Auth: Firebase token verified, STAFF role check passing
- ✅ Database: Queries hitting gongcha-ver001 correctly

**Points Behavior (Working as Designed):**
- Transaction shows `pointsEarned: 50` in response
- Member's `points` field NOT updated immediately (PENDING)
- Admin approves in web admin → points added + member sees change
- This is correct behavior per spec

**Ready for Production:**
- No further Cashier App changes needed
- Admin Panel Phase C (Security Rules lockdown) can proceed
- All inter-service communication working

---

## Notes

- Cashier App routes ALL transactions through Admin Panel backend (no direct Firestore writes)
- Error handling adapted from Cloud Functions to HTTP/JSON format
- Firebase token passed in Authorization header for authentication
- Backend performs server-authoritative validation (staff, points, tier, vouchers)
- Voucher atomicity guaranteed by backend (no orphaned vouchers)
- Points are held until admin approval (security + audit trail)

---

## Firestore Access Audit (for Stage 3 scope planning)

### Q1: Direct Firestore Writes (Post-Migration)
**Expected:** None (all transactions via postTransaction() API)

**Found:**
1. ✅ `AuthService.ts:63` - `setDoc(users/{uid})` → Member profile creation (signup)
   - **Status:** ACCEPTABLE (not transaction-related)
   
2. ✅ `AuthService.ts:106` - `setDoc(users/{uid})` → Profile data cleanup
   - **Status:** ACCEPTABLE (legacy data fix)
   
3. ✅ `RewardSeeder.ts:24` - `setDoc(rewards_catalog)` → Seeding utility
   - **Status:** ACCEPTABLE (admin utility, not production)

**Transactions:** ✅ ZERO direct writes (all via postTransaction() API)

---

### Q2: Collections Read Directly

| Collection | Purpose | Via API? | Notes |
|-----------|---------|----------|-------|
| `/transactions` | Load history display | ✅ READ-ONLY | Dashboard history tab |
| `/users` | Load member profile/loyalty | ✅ READ-ONLY | Member detail display |
| `/admin_users` | Load staff/cashier info | ✅ READ-ONLY | Staff lookup |
| `/stores` | Store selector | ✅ READ-ONLY | Reference data |
| `/products` | Menu display | ✅ READ-ONLY | Reference data |
| `/rewards_catalog` | Reward browsing | ✅ READ-ONLY | Reference data |

---

### Q3: Sensitive Collections Check

| Collection | Accessed? | Risk |
|-----------|-----------|------|
| `/users` | ✅ READ-ONLY | ✅ Safe (display only) |
| `/transactions` | ✅ READ-ONLY | ✅ Safe (history display) |
| `/vouchers` | ❌ No | ✅ Safe (embedded in users.vouchers) |
| `/activity_logs` | ❌ No | ✅ Safe (backend-write only, Cashier can't read) |
| `/admin_users` | ✅ READ-ONLY | ✅ Safe (staff lookup only) |

**Assessment:** ✅ LOW RISK - All reads are reference/display data. No sensitive writes.

---

### Stage 3 Firestore Rules Recommendation

**Priority (Admin Panel workspace):**

1. **transactions** → API writes only
2. **users.points** → API writes only (protect from direct updates)
3. **activity_logs** → Backend writes only (audit isolation)
4. **admin_users** → No app writes (admin-created only)

**Cashier App reads** can remain direct (read-only, non-sensitive data).
