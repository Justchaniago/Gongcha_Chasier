// src/types/types.ts

// ============================================================================
// 1. ADMIN & STAFF ROLES
// ============================================================================
export type AdminRole = "SUPER_ADMIN" | "STAFF" | "admin" | "master" | "manager";

// Representasi dari collection 'admin_users' / 'Staff' di Web Panel
export interface StaffProfile {
  uid: string; // Aligned dengan web panel (sebelumnya id)
  name: string;
  email: string;
  role: AdminRole;
  assignedStoreId: string | null;
  isActive?: boolean;
}

// ============================================================================
// 2. USERS (Customer)
// ============================================================================
export type UserTier = "BRONZE" | "SILVER" | "GOLD" | "Silver" | "Gold" | "Platinum";
export type VoucherType = "personal" | "catalog";

export interface UserVoucher {
  id: string;
  code: string;
  title: string;
  rewardId?: string;
  expiresAt?: string;
  expiry?: any; // Mengakomodasi Timestamp web panel
  isUsed?: boolean;
  type?: VoucherType;
}

export interface UserProfile {
  uid: string; // Aligned dengan web panel (sebelumnya id)
  name: string;
  phone?: string;
  phoneNumber?: string;
  email?: string; 
  photoURL?: string; 
  points?: number;
  currentPoints?: number;
  lifetimePoints?: number;
  tierXp?: number;
  xp?: number;
  tier: UserTier;
  joinedDate?: string;
  vouchers?: UserVoucher[]; 
  activeVouchers?: UserVoucher[];
  role?: string; 
  // xpHistory dihapus di Kasir demi efisiensi read/write (Menghindari BOM Waktu dokumen 1MB)
}

// ============================================================================
// 3. TRANSACTIONS
// ============================================================================
export type TransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "pending" | "verified" | "rejected";
export type TransactionType = "earn" | "redeem";

export interface TransactionRecord {
  id?: string;
  receiptNumber: string;  // Aligned dengan web panel (sebelumnya transactionId)
  storeId: string;        // Wajib ada mengikuti web panel
  storeName: string;      // Aligned dengan web panel (sebelumnya storeLocation)
  userId: string | null;  // Aligned dengan web panel
  totalAmount: number;    // Aligned dengan web panel (sebelumnya amount)
  status: TransactionStatus;
  createdAt: any;         // Menggunakan any agar kompatibel dengan serverTimestamp() client SDK
  
  // Additional loyalty fields (aligned dengan web panel)
  memberId?: string;      
  memberName?: string;    
  staffId?: string;       
  potentialPoints?: number;
  type?: TransactionType;
  verifiedAt?: any;
  verifiedBy?: string;
  
  // Custom metadata untuk keperluan riwayat kasir lokal
  voucherCode?: string; 
  voucherTitle?: string; 
}

// ============================================================================
// 4. REWARDS (MARKETING)
// ============================================================================
export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsrequired: number;
  imageUrl: string;
  isActive: boolean;
}

// ============================================================================
// 5. DAILY STATS (The God Document)
// ============================================================================
export interface DailyStat {
  id?: string;
  date: string;
  type: "GLOBAL" | "STORE";
  storeId: string;
  totalRevenue: number;
  totalTransactions: number;
  visitedMemberIds?: string[]; // Menyimpan UID member unik
  updatedAt: any;
}