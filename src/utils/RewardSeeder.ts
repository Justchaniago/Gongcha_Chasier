import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';

export const RewardSeeder = {
  async runSeed() {
    const rewards = [
      {
        id: 'r1',
        title: 'Free Milk Tea',
        pointsCost: 500,
        description: 'Medium size. Classic favorite.',
        category: 'Drink'
      },
      {
        id: 'r2',
        title: 'Free Pearl Topping',
        pointsCost: 200,
        description: 'Tambahan topping pearl untuk semua minuman.',
        category: 'Topping'
      }
    ];

    for (const r of rewards) {
      await setDoc(doc(firestoreDb, 'rewards_catalog', r.id), r);
    }
    console.log("✅ Rewards catalog seeded!");
  }
};