# Role-Based Access Setup Guide

## Overview
Gong Cha App sekarang mendukung 2 tipe role user:
- **`trial`** - Default role untuk semua user baru (normal customer)
- **`master`** - Admin/testing account dengan akses penuh

## 📋 Role Field Implementation

### Data Structure
Setiap user di Firestore `users/{uid}` memiliki field tambahan:
```typescript
{
  id: string;
  name: string;
  phoneNumber: string;
  currentPoints: number;
  lifetimePoints: number;
  tierXp: number;
  xpHistory: XpRecord[];
  tier: 'Silver' | 'Gold' | 'Platinum';
  joinedDate: string;
  vouchers: UserVoucher[];
  role?: 'master' | 'trial'; // 👈 NEW FIELD
}
```

### Default Behavior
- Semua user signup baru otomatis dapat `role: 'trial'`
- Jika field `role` tidak ada di existing user → dianggap `'trial'` (backward compatible)

---

## 🚀 How to Create Accounts

### 1️⃣ Create Trial Accounts (Normal Users)
**Cara termudah: Sign up lewat app**

1. Buka app di simulator/device
2. Masuk ke Welcome Screen → pilih **Sign Up**
3. Isi nomor HP (misal: `081234567890`)
4. Submit phone number
5. Masukkan dummy OTP `123456`
6. Masukkan nama (misal: `Trial User 1`)
7. Submit → user baru otomatis dibuat dengan `role: 'trial'`

**Catatan:**
- Phone number akan di-convert jadi email: `081234567890@gongcha-id.app`
- Password fixed: `GongCha@123`
- Role default: `trial`

---

### 2️⃣ Create Master Account (Admin/Testing)

#### **Option A: Manual via Firebase Console** (Recommended)

**Step 1: Buat Auth User di Firebase Authentication**

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **gongcha-app-4691f**
3. Klik **Authentication** di sidebar kiri
4. Tab **Users** → klik **Add user**
5. Isi form:
   - **Email:** `0812MASTER@gongcha-id.app`
   - **Password:** `GongCha@123` (atau password lain yang mudah diingat)
6. Klik **Add user**
7. **Copy User UID** dari kolom User UID (format: panjang 28 karakter huruf/angka)

**Step 2: Buat Firestore Document untuk User Profile**

1. Di Firebase Console, klik **Firestore Database** di sidebar
2. Buka collection `users`
3. Klik **Add document**
4. **Document ID:** Paste UID dari Step 1 (jangan auto-ID)
5. Isi fields:
   ```
   Field Name          | Type     | Value
   -------------------|----------|---------------------------
   id                 | string   | (sama dengan Document ID)
   name               | string   | Master Admin
   phoneNumber        | string   | 0812MASTER
   currentPoints      | number   | 0
   lifetimePoints     | number   | 0
   tierXp             | number   | 0
   tier               | string   | Silver
   joinedDate         | string   | 2025-01-01T00:00:00.000Z
   role               | string   | master 👈 SET INI
   xpHistory          | array    | []
   vouchers           | array    | []
   ```
6. Klik **Save**

**Step 3: Login di App**

1. Buka app → Welcome Screen → pilih **Login**
2. Masukkan phone: `0812MASTER`
3. Masukkan dummy OTP `123456`
4. Submit → berhasil login sebagai **master account**

---

#### **Option B: Upgrade Existing Trial Account to Master**

Jika kamu sudah punya trial account yang ingin dijadikan master:

1. Login ke app dengan trial account tersebut
2. Cek **Profile Screen** → lihat nama user
3. Buka Firebase Console → **Firestore Database** → collection `users`
4. Cari document dengan nama yang sesuai (atau cek berdasarkan phoneNumber)
5. Klik document → Edit field `role`
6. Ubah dari `trial` menjadi `master`
7. Klik **Update**
8. **Kill app dan restart** → account sekarang jadi master

---

## 🔍 How to Check Current Role

### Via Firebase Console
1. Firestore Database → collection `users`
2. Klik document user yang ingin dicek
3. Lihat field `role` → `master` atau `trial`

### Via App (For Testing)
Saat ini role field belum ditampilkan di UI. Untuk debugging, kamu bisa:

1. Tambahkan sementara di [ProfileScreen.tsx](src/screens/ProfileScreen.tsx):
   ```typescript
   <Text>Role: {userProfile?.role || 'trial'}</Text>
   ```
2. Atau check via Firebase Console (lebih cepat)

---

## 🧪 Testing Scenario

### Skenario 1: Test Multiple Trial Accounts
1. Buat 3-5 trial accounts dengan nomor HP berbeda:
   - `08111111111` → Trial User 1
   - `08222222222` → Trial User 2
   - `08333333333` → Trial User 3
2. Login bergantian, cek apakah:
   - Points/XP terisolasi per account
   - Voucher tidak tercampur
   - Session persistence bekerja (kill app → auto-login ke account terakhir)

### Skenario 2: Master Account for Admin Testing
1. Buat 1 master account: `0812MASTER`
2. Gunakan untuk:
   - Test flow keseluruhan tanpa perlu ganti-ganti account
   - Simulate high-tier user (manually set `tier: 'Platinum'` di Firestore)
   - Test voucher redemption dengan unlimited points (manually set `currentPoints: 999999`)

### Skenario 3: Role-Based Feature Access (Future Enhancement)
**Contoh implementasi (belum ada di code):**

Di [HomeScreen.tsx](src/screens/HomeScreen.tsx), kamu bisa tambahkan:
```typescript
const userProfile = await MockBackend.getUser();

if (userProfile?.role === 'master') {
  // Show admin panel button
  return <AdminPanelButton onPress={() => navigation.navigate('AdminDashboard')} />;
}
```

---

## 📝 Summary Checklist

### For Trial Accounts
- ✅ Sign up via app → otomatis `role: 'trial'`
- ✅ Phone → Email mapping: `{phone}@gongcha-id.app`
- ✅ Default password: `GongCha@123`

### For Master Account
- ✅ Option A: Manual create di Firebase Console (Auth + Firestore)
- ✅ Option B: Upgrade existing trial → edit field `role` di Firestore
- ✅ Login dengan phone number yang didaftarkan
- ✅ Cek role di Firebase Console → field `role` = `master`

### Current Limitations
- Role field **belum digunakan** untuk authorization logic di app (semua user masih akses fitur yang sama)
- Untuk implementasi role-based UI guards, kamu perlu tambahkan conditional rendering di screens yang relevan

---

## 🛠 Next Steps (Optional Enhancements)

1. **Add Role Display in Profile Screen**
   - Show badge "Master" or "Trial" di ProfileScreen
   - Gunakan different styling (gold badge untuk master)

2. **Implement Role-Based Guards**
   - Hide/show certain features based on role
   - Example: Admin dashboard hanya untuk master accounts

3. **Master Account Privileges**
   - Unlimited points untuk testing
   - Access to all vouchers without expiry
   - Ability to reset account data

4. **Role Management UI**
   - Screen khusus untuk master account
   - List semua users dengan option upgrade/downgrade role
   - Firestore batch operations untuk bulk role updates

---

## 🔗 Related Files
- [src/types/types.ts](src/types/types.ts) - UserProfile interface dengan role field
- [src/services/AuthService.ts](src/services/AuthService.ts) - Register logic dengan default role 'trial'
- [src/services/MockBackend.ts](src/services/MockBackend.ts) - Firestore operations dengan role field support
- [src/config/firebase.ts](src/config/firebase.ts) - Firebase configuration

---

## 📞 Support
Jika ada issue atau pertanyaan setup:
1. Check Firebase Console → Authentication & Firestore untuk verify data
2. Check app logs di Expo console
3. Pastikan Firebase project ID cocok: `gongcha-app-4691f`
