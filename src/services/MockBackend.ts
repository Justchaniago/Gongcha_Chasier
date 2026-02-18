import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile, MemberTier, XpRecord, RewardItem, UserVoucher } from '../types/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RULES = {
  CONVERSION_RATE: 100, // 1 XP = Rp 100
  TIER_LIMITS: {
    Silver: 0,
    Gold: 5000,
    Platinum: 15000,
  },
  XP_VALIDITY_DAYS: 365,
};

const REWARD_CATALOG: RewardItem[] = [
  {
    id: 'r1',
    title: 'Free Milk Tea',
    description: 'Medium size. Classic favorite.',
    pointsCost: 500,
    image: require('../../assets/images/voucherdrink1.png'),
    category: 'Drink',
  },
  {
    id: 'r2',
    title: 'Free Pearl',
    description: 'Add chewy pearl topping to any drink.',
    pointsCost: 200,
    image: require('../../assets/images/boba.webp'),
    category: 'Topping',
  },
  {
    id: 'r3',
    title: 'Rp 20.000 Discount',
    description: 'Min. spend Rp 50.000.',
    pointsCost: 800,
    image: require('../../assets/images/voucher20k.png'),
    category: 'Discount',
  },
  {
    id: 'r4',
    title: 'Free Gongcha Tea',
    description: 'Large size with fresh milk.',
    pointsCost: 1200,
    image: require('../../assets/images/voucherdrink2.png'),
    category: 'Drink',
  },
];

export const MockBackend = {
  POINT_CONVERSION: RULES.CONVERSION_RATE,
  TIER_MILESTONES: {
    Gold: RULES.TIER_LIMITS.Gold,
    Platinum: RULES.TIER_LIMITS.Platinum,
  },

  // --- HELPER: UPDATE PROFILE ---
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await delay(120);
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error('User not found');
    
    const userRef = doc(firestoreDb, 'users', currentUser.uid);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) throw new Error('User profile not found');
    
    const data = snapshot.data() as UserProfile;
    const updatedProfile: UserProfile = {
      ...data,
      ...updates,
    };
    
    await setDoc(userRef, updatedProfile, { merge: true });
    return updatedProfile;
  },

  // --- INTERNAL: HITUNG TIER ---
  _calculateTierStatus(xpHistory: XpRecord[]): { activeXp: number; newTier: MemberTier; activeRecords: XpRecord[] } {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - RULES.XP_VALIDITY_DAYS);

    const activeRecords = xpHistory.filter((record) => new Date(record.date) > cutoffDate);
    const activeXp = activeRecords.reduce((sum, record) => {
      const isEarnEvent = (record.type || 'earn') === 'earn';
      const includeForTier = record.tierEligible !== false;
      if (!isEarnEvent || !includeForTier) return sum;
      return sum + Math.max(0, record.amount);
    }, 0);

    let newTier: MemberTier = 'Silver';
    if (activeXp >= RULES.TIER_LIMITS.Platinum) {
      newTier = 'Platinum';
    } else if (activeXp >= RULES.TIER_LIMITS.Gold) {
      newTier = 'Gold';
    }

    return { activeXp, newTier, activeRecords };
  },

  // --- INTERNAL: NORMALIZE & CEK ADMIN ---
  _normalizeUserProfile(user: Partial<UserProfile>, fallback: { id: string; name: string; phoneNumber: string }): UserProfile {
    const normalizedHistory = (user.xpHistory || []).map((record) => ({
      ...record,
      type: record.type || 'earn',
      context: record.context || ((record.type || 'earn') === 'redeem' ? 'Reward Redeem' : 'Drink Purchase'),
      location: record.location || 'Gong Cha App',
      tierEligible: record.tierEligible ?? ((record.type || 'earn') === 'earn'),
    }));

    // --- SECURITY: ADMIN UID LIST (UPDATED) ---
    const ADMIN_UIDS = ['qIyNEH8XywdBubH5PugI5qQTwc53']; 
    
    const isHardcodedAdmin = ADMIN_UIDS.includes(fallback.id);
    const determinedRole = (user.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'member';

    const base: UserProfile = {
      id: user.id || fallback.id,
      name: user.name || fallback.name,
      phoneNumber: user.phoneNumber || fallback.phoneNumber,
      email: user.email,     
      photoURL: user.photoURL,
      currentPoints: user.currentPoints ?? 0,
      lifetimePoints: user.lifetimePoints ?? user.currentPoints ?? 0,
      tierXp: user.tierXp ?? 0,
      xpHistory: normalizedHistory,
      tier: user.tier || 'Silver',
      joinedDate: user.joinedDate || new Date().toISOString(),
      vouchers: user.vouchers || [],
      role: determinedRole, 
    };

    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(base.xpHistory);

    return {
      ...base,
      tierXp: activeXp,
      tier: newTier,
      xpHistory: activeRecords,
    };
  },

  _getAuthIdentity(phoneNumber?: string): { uid: string; name: string; phoneNumber: string } {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Not authenticated. Please login first.');
    }

    const normalizedPhone =
      phoneNumber ||
      user.email?.split('@')[0] ||
      '8123456789';

    return {
      uid: user.uid,
      name: user.displayName || 'Gong Cha Member',
      phoneNumber: normalizedPhone,
    };
  },

  async initUser(phoneNumber: string): Promise<UserProfile> {
    await delay(120);
    const identity = this._getAuthIdentity(phoneNumber);
    const userRef = doc(firestoreDb, 'users', identity.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      const normalized = this._normalizeUserProfile(snapshot.data() as Partial<UserProfile>, {
        id: identity.uid,
        name: identity.name,
        phoneNumber: identity.phoneNumber,
      });
      await setDoc(userRef, normalized, { merge: true });
      return normalized;
    }

    const newUser: UserProfile = {
      id: identity.uid,
      name: identity.name,
      phoneNumber: identity.phoneNumber,
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      xpHistory: [],
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: 'member', 
    };
    
    const finalUser = this._normalizeUserProfile(newUser, {
        id: identity.uid,
        name: identity.name,
        phoneNumber: identity.phoneNumber
    });

    await setDoc(userRef, finalUser);
    return finalUser;
  },

  async getUser(): Promise<UserProfile | null> {
    await delay(120);

    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(firestoreDb, 'users', currentUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const phoneFromEmail = currentUser.email?.split('@')[0] || '8123456789';
      const fallbackIdentity = {
          id: currentUser.uid,
          name: currentUser.displayName || phoneFromEmail || 'Member',
          phoneNumber: phoneFromEmail
      };
      
      const tempUser: UserProfile = {
        ...fallbackIdentity,
        currentPoints: 0,
        lifetimePoints: 0,
        tierXp: 0,
        xpHistory: [],
        tier: 'Silver',
        joinedDate: new Date().toISOString(),
        vouchers: [],
        role: 'member',
      };
      
      return this._normalizeUserProfile(tempUser, fallbackIdentity);
    }

    const data = snapshot.data() as UserProfile;
    
    const normalizedData = this._normalizeUserProfile(data, {
        id: currentUser.uid,
        name: data.name,
        phoneNumber: data.phoneNumber
    });
    
    if (data.id !== currentUser.uid || data.role !== normalizedData.role) {
      await setDoc(userRef, normalizedData, { merge: true });
    }
    
    return normalizedData;
  },

  async getCatalog(): Promise<RewardItem[]> {
    await delay(300);
    return REWARD_CATALOG;
  },

  async addTransaction(amount: number): Promise<UserProfile> {
    await delay(180);
    const user = await this.getUser();
    if (!user) throw new Error('User not found');
    const earnedVal = Math.floor(amount / RULES.CONVERSION_RATE);
    const safeLifetimePoints = user.lifetimePoints ?? user.currentPoints ?? 0;

    user.currentPoints += earnedVal;
    user.lifetimePoints = safeLifetimePoints + earnedVal;
    user.vouchers = user.vouchers || [];

    const newXpRecord: XpRecord = {
      id: `xp_${Date.now()}`,
      date: new Date().toISOString(),
      amount: earnedVal,
      type: 'earn',
      context: amount >= 50000 ? 'Drink Purchase' : 'Admin Top Up',
      location: 'Gong Cha App',
      tierEligible: true,
    };
    user.xpHistory.push(newXpRecord);

    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(user.xpHistory);
    const updatedUser: UserProfile = {
      ...user,
      tierXp: activeXp,
      tier: newTier,
      xpHistory: activeRecords,
    };

    await setDoc(doc(firestoreDb, 'users', user.id), updatedUser, { merge: true });
    return updatedUser;
  },

  async redeemReward(rewardId: string): Promise<UserProfile> {
    await delay(180);
    const user = await this.getUser();
    if (!user) throw new Error('User not found');
    const safeUser: UserProfile = {
      ...user,
      lifetimePoints: user.lifetimePoints ?? user.currentPoints ?? 0,
      vouchers: user.vouchers || [],
    };
    const reward = REWARD_CATALOG.find((catalogItem) => catalogItem.id === rewardId);

    if (!reward) throw new Error('Reward tidak ditemukan');
    if (safeUser.currentPoints < reward.pointsCost) throw new Error('Poin tidak cukup.');

    const newVoucher: UserVoucher = {
      id: `v_${Date.now()}`,
      rewardId: reward.id,
      title: reward.title,
      code: `GC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      redeemedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    };

    const redeemHistory: XpRecord = {
      id: `xp_redeem_${Date.now()}`,
      date: new Date().toISOString(),
      amount: reward.pointsCost,
      type: 'redeem',
      context: reward.title,
      location: 'Rewards Catalog',
      tierEligible: false,
    };

    const updatedUser: UserProfile = {
      ...safeUser,
      currentPoints: safeUser.currentPoints - reward.pointsCost,
      xpHistory: [...(safeUser.xpHistory || []), redeemHistory],
      vouchers: [newVoucher, ...safeUser.vouchers],
    };

    await setDoc(doc(firestoreDb, 'users', safeUser.id), updatedUser, { merge: true });
    return updatedUser;
  },

  async getVoucherCheckoutPayload(voucherId: string): Promise<string> {
    await delay(250);
    const user = await this.getUser();
    if (!user) throw new Error('User not found');

    const voucher = (user.vouchers || []).find((item) => item.id === voucherId);
    if (!voucher) throw new Error('Voucher tidak ditemukan');
    if (voucher.isUsed) throw new Error('Voucher sudah digunakan');
    if (new Date(voucher.expiresAt).getTime() < Date.now()) throw new Error('Voucher sudah kedaluwarsa');

    return JSON.stringify({
      type: 'GONGCHA_VOUCHER',
      voucherId: voucher.id,
      code: voucher.code,
      userId: user.id,
      issuedAt: new Date().toISOString(),
      nonce: Math.random().toString(36).slice(2, 12),
    });
  },

  async markVoucherUsed(voucherId: string): Promise<UserProfile> {
    await delay(140);
    const user = await this.getUser();
    if (!user) throw new Error('User not found');
    const vouchers = user.vouchers || [];
    const targetIndex = vouchers.findIndex((item) => item.id === voucherId);

    if (targetIndex < 0) throw new Error('Voucher tidak ditemukan');
    const targetVoucher = vouchers[targetIndex];
    if (targetVoucher.isUsed) throw new Error('Voucher sudah digunakan');

    const updatedVouchers = [...vouchers];
    updatedVouchers[targetIndex] = { ...targetVoucher, isUsed: true };

    const updatedUser: UserProfile = { ...user, vouchers: updatedVouchers };
    await setDoc(doc(firestoreDb, 'users', user.id), updatedUser, { merge: true });
    return updatedUser;
  },

  // --- NEW: RESET DATA FUNCTION ---
  async resetData(): Promise<void> {
    await delay(120);
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;
    
    // Hapus total data user dari Firestore
    await deleteDoc(doc(firestoreDb, 'users', currentUser.uid));
  },
};

export default MockBackend;