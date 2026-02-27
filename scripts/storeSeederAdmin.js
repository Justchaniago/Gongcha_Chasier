// Seeder Firestore Stores Collection via Node.js (Admin SDK)
// Jalankan: node scripts/storeSeederAdmin.js

const admin = require('firebase-admin');
const path = require('path');

// Ganti path berikut ke lokasi file service account JSON Anda
const envPath = path.resolve(__dirname, '../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(envPath),
});

const db = admin.firestore();

const outlets = [
  {
    id: 'store_mbg',
    name: 'Gongcha Mall Bali Galeria, Kuta',
    address: 'Jl. Bypass Ngurah Rai, Kec. Kuta, Kabupaten Badung, Bali',
    latitude: -8.722934939224709,
    longitude: 115.18326666263233,
    openHours: '10:00-21:45',
    isActive: true,
  },
  {
    id: 'store_pms',
    name: 'Gongcha Pakuwon Mall, Surabaya',
    address: 'Pakuwon Mall, Lantai 2',
    latitude: -7.289631871538605,
    longitude: 112.67526826076585,
    openHours: '10:00 - 21:30',
    isActive: true,
  },
  {
    id: 'store_tp6',
    name: 'Gongcha Tunjungan Plaza 6, Surabaya',
    address: 'Tunjungan Plaza 6, Lantai 3',
    latitude: -7.260210193648603,
    longitude: 112.7387282571127,
    openHours: '10:00 - 21:30',
    isActive: true,
  },
];

async function seedStores() {
  for (const outlet of outlets) {
    await db.collection('stores').doc(outlet.id).set(outlet);
    console.log(`Seeded: ${outlet.name}`);
  }
  console.log('✅ Store data seeded!');
  process.exit(0);
}

seedStores().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
