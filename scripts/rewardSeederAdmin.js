// Seeder Firestore Rewards Catalog via Node.js (Admin SDK)
// Jalankan: node scripts/rewardSeederAdmin.js

const admin = require('firebase-admin');
const path = require('path');

// Ganti path berikut ke lokasi file service account JSON Anda
envPath = path.resolve(__dirname, '../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(envPath),
});

const db = admin.firestore();

const rewards = [
  {
    id: 'r1',
    title: 'Free Milk Tea',
    pointsCost: 500,
    description: 'Medium size. Classic favorite.',
    category: 'Drink',
  },
  {
    id: 'r2',
    title: 'Free Pearl Topping',
    pointsCost: 200,
    description: 'Tambahan topping pearl untuk semua minuman.',
    category: 'Topping',
  },
  // Tambahkan reward lain sesuai kebutuhan
];

async function seedRewards() {
  for (const r of rewards) {
    await db.collection('rewards_catalog').doc(r.id).set(r);
    console.log(`Seeded: ${r.title}`);
  }
  console.log('✅ Rewards catalog seeded (Admin SDK)!');
  process.exit(0);
}

seedRewards().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
