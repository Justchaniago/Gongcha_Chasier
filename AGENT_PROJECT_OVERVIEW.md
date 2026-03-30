## Gongcha Cashier App - Project Overview (for AI Agents)

### 1) What this project is
This repository is an Expo (React Native) mobile app used as a cashier terminal for the “Gong Cha” ecosystem. It lets authenticated staff:
- Scan QR codes to load a customer (member) profile (and optionally a voucher).
- Record “earn” transactions (member earns points based on amount).
- Redeem/mark vouchers as used.
- View transaction dashboards, including daily stats and transaction history.

Backend is implemented with Firebase:
- Firebase Auth + Firestore for data and persistence.
- Firebase Cloud Functions (callable functions) to enforce cashier authorization and write transaction/voucher updates atomically.
- A Firestore trigger to aggregate `daily_stats`.

### 2) Tech stack
Frontend (Expo / React Native)
- `expo` ~54.x
- `react` / `react-native` (includes `react-native-web` for web)
- `expo-camera` for QR scanning
- `firebase` (client SDK) for Auth/Firestore/Callable Functions
- `zustand` for global app state (staff session, active member, scanned voucher, etc.)
- `expo-blur` for glassmorphism UI and modal overlays
- `lucide-react-native` for icons
- `nativewind` + Tailwind CSS integration via `metro.config.js` and `global.css`

Backend (Firebase Functions)
- `firebase-admin`
- `firebase-functions` (callable + Firestore trigger)
- Node runtime target: `node 24` (per `functions/package.json`)

### 3) Key configuration files
Frontend / app shell
- `App.tsx`
  - Splash/loading gate.
  - Hooks into `useCashierStore().initializeAuth()` to listen auth changes.
  - After auth state is known:
    - If authenticated: renders `src/screens/CashierDashboard.tsx`
    - Else: renders `src/screens/LoginScreen.tsx`
- `app/_layout.tsx`
  - Wraps app content with `src/components/BiegeBlurBackground.tsx`
- `app.json`
  - Expo config (bundle id, permissions, splash config, icon, etc.)
- `metro.config.js`
  - Enables `nativewind` with `global.css` input.
- `tailwind.config.js` + `global.css`
  - Tailwind setup for `nativewind`.

Firebase integration
- `src/config/firebase.ts`
  - Initializes:
    - `firebaseApp`
    - `firebaseAuth` using React Native persistence via `AsyncStorage`
    - `firestoreDb` pointing to named Firestore database: `gongcha-ver001`
    - `firebaseFunctions` callable functions in region: `asia-southeast2`
  - Note: The file contains Firebase config values; do not re-paste them into other docs.

### 4) High-level folder map (most relevant)
- `src/screens/`
  - `LoginScreen.tsx`: email/password staff login UI.
  - `CashierDashboard.tsx`: main cashier UI (dashboard, scanner, member/voucher flows, history).
- `src/store/`
  - `useCashierStore.ts`: Zustand store holding staff session + member/voucher state + actions.
- `src/services/`
  - `AuthService.ts`: helper for member-style Auth + Firestore profile creation/login (not the cashier login path).
  - `TransactionService.ts`: callable-function wrappers + transaction history queries.
- `src/config/`
  - `firebase.ts`: Firebase SDK initialization.
- `src/types/`
  - `types.ts`: shared type definitions for Staff/User/Transaction/DailyStat/Voucher/Reward.
- `src/utils/`
  - `preloadAppAssets.ts`: splash critical asset preloading + optional prefetch of secondary images.
  - `RewardSeeder.ts`: seeds sample rewards to `rewards_catalog` (Firestore).
- `src/components/`
  - `BiegeBlurBackground.tsx`: simple background wrapper (not a complex blur effect; just a colored base + content layer).

Backend
- `functions/src/index.ts`
  - Callable functions:
    - `recordCashierEarnTransaction`
    - `recordCashierRedeemTransaction`
  - Firestore trigger:
    - `aggregateDailyStats` on `transactions/{transactionId}` document creation.

### 5) Runtime flow (what happens when the app opens)
1. App startup (`App.tsx`)
   - Shows splash screen while:
     - `preloadCriticalAssets()` preloads critical images.
     - Enforces minimum splash duration (`MIN_SPLASH_MS`).
   - Calls `useCashierStore.initializeAuth()` once to start Firebase Auth state listener.
2. Auth gate (`useCashierStore`)
   - On auth user present:
     - Reads staff/admin profile doc from `admin_users/{uid}`.
     - If found: sets `staff` state and triggers `fetchTodayStats()`.
3. Render
   - If `staff` session exists (`isAuthenticated`): shows `CashierDashboard`.
   - Otherwise: shows `LoginScreen`.

### 6) Cashier state management (Zustand)
File: `src/store/useCashierStore.ts`

State fields (important)
- `staff`: `{ uid, name, email, role, assignedStoreId }` or `null`
- `isAuthenticated`, `isLoadingAuth`
- `activeMember`: customer/member currently loaded via QR scan (uid, name, tier, points, vouchers...)
- `scannedVoucher`: voucher selected/scanned (object includes `code`, `title`, `isUsed`, `expiresAt`, etc.)
- dashboard aggregates:
  - `totalRevenue`, `totalTransactions`, `memberVisits`

Key actions
- `initializeAuth()`
  - subscribes to `onAuthStateChanged(firebaseAuth, ...)`
  - loads staff doc `admin_users/{uid}`
  - sets `staff` and calls `fetchTodayStats()`
- `fetchTodayStats()`
  - queries `transactions` by staff `assignedStoreId`
  - calculates totals using client-side filtering by `createdAt` >= start of today
- `processTransaction(amount, posId, useMember)`
  - computes `potentialPoints` as `Math.floor(amount / 1000)` when `useMember` is true
  - calls `TransactionService.recordTransactionClaim(...)` which invokes callable:
    - `recordCashierEarnTransaction`
  - then updates local state and clears `activeMember`
- `redeemVoucher()`
  - calls `TransactionService.recordRedeemClaim(...)` which invokes callable:
    - `recordCashierRedeemTransaction`
  - updates local member vouchers (mark local `isUsed`)
  - clears `scannedVoucher`

### 7) Member/profile and auth notes
File: `src/services/AuthService.ts`
- Provides generic register/login/logout for members using:
  - Firebase Auth (email/password)
  - Firestore collection `users/{uid}`
- `AuthService.register()` creates auth user, then writes profile fields (name/phone/tier/points defaults).
- `AuthService.login()` signs in and loads/creates fallback profile doc.
- This service is separate from the cashier staff login, which is handled in the Zustand store.

### 8) Firestore data model (collections used by this repo)
Named Firestore database:
- `gongcha-ver001` (client + server)

Collections (observed from code)
- `admin_users/{uid}`
  - staff roles and store assignment:
    - `role` (values normalized in Cloud Functions)
    - `isActive`
    - `assignedStoreId`
    - `name`, `email`
- `users/{uid}`
  - member profile:
    - loyalty fields: `points`, `pendingPoints`, `currentPoints`, `tier`, etc.
    - vouchers:
      - `vouchers`
      - `activeVouchers`
    - name/phone/email (some fields optional)
- `transactions/{transactionId}`
  - POS/cashier records:
    - `type`: `earn` or `redeem`
    - `status`: `PENDING` or `COMPLETED` (or others)
    - `storeId`, `storeName`
    - staff metadata: `staffId`, `cashierName`
    - member metadata: `uid` / `userId` / `memberId`, `memberName`
    - earn-specific:
      - `totalAmount`, `potentialPoints`, `pointsEarned`, `pointsState`
    - redeem-specific:
      - `voucherCode`, `voucherTitle`
    - timestamps:
      - `createdAt` = server timestamp from callable function
- `daily_stats/{statId}`
  - created/updated by trigger on new `transactions` docs:
    - `date` = YYYY-MM-DD
    - `type` = `STORE`
    - `storeId`
    - `totalTransactions` incremented
    - `totalRevenue` incremented for earn transactions
    - `visitedMemberIds` arrayUnion
- `rewards_catalog/{rewardId}` (seeded by `RewardSeeder.ts`)

### 9) Cloud Functions API (callable endpoints)
File: `functions/src/index.ts`

Region / database
- Region for callables & triggers: `asia-southeast2`
- Firestore Admin client targets: database `gongcha-ver001`

Authorization model (cashier write)
- Cashier writes are gated by the authenticated user’s `admin_users/{uid}` doc:
  - `isActive` must not be `false`
  - `role` is normalized:
    - `SUPER_ADMIN` role accepts `SUPER_ADMIN`/`ADMIN`/`MASTER` (case variants)
    - `STAFF` role accepts `STAFF`/`MANAGER` (case variants)
  - `requestedStoreId` restriction:
    - staff (non-`SUPER_ADMIN`) can only write for their `assignedStoreId`

1) `recordCashierEarnTransaction` (callable)
Input payload (from client `TransactionService`)
- `receiptNumber`: POS receipt id (string)
- `totalAmount`: positive number
- `potentialPoints`: points amount (integer)
- `uid` (optional/null): member UID
- `memberId` / `memberName` (optional): member info
- `storeId`, `storeName`

Transaction id format
- Build function: `${YYYYMMDD}-${normalizedReceipt}`
- normalized receipt: trims + collapses spaces into `-`

Write logic
- Uses a Firestore transaction:
  - ensures transaction doc does not already exist (idempotency via `already-exists`)
  - for earn:
    - if member UID present and `potentialPoints > 0`:
      - sets transaction `status = "PENDING"`, `pointsState = "PENDING"`
      - increments `users/{uid}.pendingPoints`
    - else:
      - sets `status = "COMPLETED"`, `pointsState = "NONE"`

Return
- `{ transactionId }`

2) `recordCashierRedeemTransaction` (callable)
Input payload (from client `TransactionService`)
- `receiptNumber`: receipt id (string)
- `storeId`, `storeName`
- `userId`, `memberId`, `memberName`
- `voucherCode`, `voucherTitle` (title optional)

Transaction id format
- `REDEEM-${receiptNumber}`

Write logic
- Firestore transaction:
  - ensures redemption transaction doc does not already exist
  - loads member `users/{userId}` doc
  - finds voucher in either:
    - `vouchers[]` or
    - `activeVouchers[]`
  - marks voucher as used by setting `isUsed: true`
  - writes voucher arrays back with `{merge: true}`
  - writes `transactions/{transactionId}` with:
    - `type = "redeem"`, `status = "COMPLETED"`, `pointsState = "NONE"`
    - includes `voucherCode`, `voucherTitle`

Return
- `{ transactionId }`

3) `aggregateDailyStats` (Firestore trigger)
Trigger
- On creation of `transactions/{transactionId}` document

Aggregation logic
- Only counts transactions whose `status` is one of:
  - `COMPLETED`, `PENDING`, `VERIFIED`
- Only uses `type`:
  - when `type` is `EARN`: increments `daily_stats.totalRevenue` by `totalAmount`
  - always increments `daily_stats.totalTransactions`
- `visitedMemberIds` updated using arrayUnion:
  - reads `uid || userId || memberId` from transaction doc

### 10) Client-side transaction/scan flow (UI behavior)
Main file: `src/screens/CashierDashboard.tsx`

Dashboard layout
- Top-level tabs: `HOME`, `HISTORY`, `PROFILE`
- Floating button:
  - `SCAN QR` opens `ScannerOverlay`

Scanner overlay
- Uses `expo-camera`’s `CameraView` and scans only `barcodeTypes: ["qr"]`
- On scan:
  - `handleSimulateScan(data)` interprets scanned payload:
    - If string starts with `VOUCHER:<uid>:<voucherCode>`: loads user and selects that voucher code
    - If string looks like JSON: attempts to parse `uid` / `voucherCode`
    - Else: treats payload as `uid`
- Loads member doc from `users/{uid}`
- Determines “member-like” vs “staff/admin” by checking user `role`:
  - rejects roles: admin/master/manager/staff/super_admin (case-insensitive)
- Sets:
  - `storeState.setActiveMember(...)`
  - opens member page
  - if voucher code exists and is found in vouchers:
    - sets `scannedVoucher` after a short delay

Earn transaction UI (member page)
- Member detail page shows:
  - member tier + points
  - vouchers with `!isUsed` that can be redeemed
  - member history (up to 10 items) fetched from client querying `transactions` by storeId
- For earning, user enters:
  - `POS Receipt ID`
  - `Nominal Belanja (Rp)`
- Before final processing:
  - checks duplicate receipt usage using `TransactionService.hasTodayReceipt(storeId, posTrxId)`
- On confirm:
  - calls Zustand action `processTransaction(amount, posTrxId, true)`

Redeem voucher UI
- When a voucher is selected/scanned:
  - a modal shows voucher details
  - “Mark as Used” button calls Zustand `redeemVoucher()`

History UI
- `rawTransactions` are kept in state using `onSnapshot()` query:
  - `transactions` where `storeId == staff.assignedStoreId`
- “HISTORY” shows grouped transactions/redemptions by date.
- A history detail modal shows either:
  - earn fields (totalAmount, points)
  - redeem fields (voucherTitle)

Sync/status indicator
- Dashboard uses `syncData()` which calls `fetchTodayStats()`
- Also uses a `onSnapshot` listener for `transactions` to provide “live” updates.

### 11) Running the project (local dev)
Frontend
- Install dependencies:
  - `npm install`
- Start Expo:
  - `npm run start`
- Platforms:
  - `npm run android`
  - `npm run ios`
  - `npm run web`

Backend (Cloud Functions)
- Inside `functions/`:
  - `npm run serve` (build + start Firebase emulators for functions)
  - `npm run deploy` (deploy functions)
  - `npm run logs` (view function logs)

### 12) Important local/untracked files in this workspace
This workspace contains additional local/untracked artifacts (visible in git status at conversation start), including:
- Firestore security config files:
  - `firestore.rules`
  - `firestore.indexes.json`
- `functions/lib/` (compiled output)
- `functions/firebase-debug.log`
- `pos-app-audit.zip`
- `assets/images/logoandroid.png`

When coordinating with other agents:
- Treat `functions/lib/` and `firebase-debug.log` as build/debug artifacts.
- Be careful with anything that looks like secrets (Firebase config is in `src/config/firebase.ts`).

### 13) Where to look next (if you need to modify behavior)
- Authorization / transaction idempotency logic:
  - `functions/src/index.ts`
- Callable request/response mapping + error handling:
  - `src/services/TransactionService.ts`
- Auth/session for staff:
  - `src/store/useCashierStore.ts` + `src/config/firebase.ts`
- QR decoding + payload contract:
  - `src/screens/CashierDashboard.tsx` (`handleSimulateScan`)
- UI entry/splash gating:
  - `App.tsx`
