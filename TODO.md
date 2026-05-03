# TODO: Fix add transaksi gagal verifikasi id receipt

## Steps to Complete:

1. ✅ Create/update TODO.md with current fix plan
2. ✅ Edit `functions/src/index.ts`
   - ✅ Safe fallback on `authorizeCashierWrite` for legacy/admin flow
   - ✅ Improve explicit auth error messages for cashier credential mismatch
3. ✅ Edit `src/services/TransactionService.ts`
   - ✅ Map permission/auth errors to actionable Indonesian messages
4. ✅ Verify frontend payload guard (`src/store/useCashierStore.ts` and/or `src/screens/CashierDashboard.tsx`)
   - ✅ Ensure `staffId`, `passcode`, `storeId`, `storeName` always present before submit
5. ⏳ Run validation checks (typecheck/build for app + functions)
6. ⏳ Summarize root cause and fix outcome
