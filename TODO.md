# Update CashierDashboard.tsx - Use DB "name" field for displays

**Status:** Planning

**Information Gathered:**
- File analyzed (user provided content).
- Store name: `docSnap.data().namePlace || docSnap.data().name` → Change to `data.name` only.
- Transactions: Save `cashierName: staff.name` (DB field), display `cashierName` → Change to `name`.
- Member: `userData.name` from users DB (good).
- History detail: Use `selectedHistoryItem?.name` instead of `cashierName`.

**Plan:**
1. src/screens/CashierDashboard.tsx:
   - Store fetch: Change `namePlace || name` to `name`.
   - rawTransactions transformation: Use `name: data.name` instead of `cashierName: data.cashierName`.
   - History detail modal: Display `name` instead of `cashierName`.
2. src/store/useCashierStore.ts:
   - Transaction save: `cashierName: staff.name` → `name: staff.name`.

**Dependent Files:**
- src/screens/CashierDashboard.tsx
- src/store/useCashierStore.ts

**Followup:**
- Test displays after changes.
- npx expo start --clear

Approve plan to proceed with edits?

