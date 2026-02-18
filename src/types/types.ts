export type MemberTier = 'Silver' | 'Gold' | 'Platinum';
export type HistoryEventType = 'earn' | 'redeem';

// --- NEW STAFF PROFILE ---
export interface StaffProfile {
  id: string; // ID unik staff (biasanya dari UID Firebase Auth)
  name: string;
  email: string;
  role: 'cashier' | 'store_manager';
  storeLocation: string;
}

export interface XpRecord {
  id: string;
  date: string;
  amount: number;
  type?: HistoryEventType;
  context?: string;
  location?: string;
  tierEligible?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  
  // --- UPDATED FIELDS ---
  email?: string; 
  photoURL?: string; 
  
  currentPoints: number;
  lifetimePoints: number;
  tierXp: number;
  xpHistory: XpRecord[];
  tier: MemberTier;
  joinedDate: string;
  vouchers: UserVoucher[];
  
  // --- UPDATED ROLE ---
  role?: 'master' | 'trial' | 'admin' | 'member'; 
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  pointsEarned: number;
  items: string[];
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  image: any;
  category: 'Drink' | 'Topping' | 'Discount';
}

export interface UserVoucher {
  id: string;
  rewardId: string;
  title: string;
  code: string;
  redeemedAt: string;
  expiresAt: string;
  isUsed: boolean;
}