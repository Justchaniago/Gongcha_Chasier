import { Asset } from 'expo-asset';
import { Image } from 'react-native';

const LOCAL_ASSETS = [
  require('../../assets/images/logo1.webp'),
  require('../../assets/images/logowhite.webp'),
  require('../../assets/images/welcome1.webp'),
  require('../../assets/images/card1.webp'),
  require('../../assets/images/abstract1.webp'),
  require('../../assets/images/abstract2.webp'),
  require('../../assets/images/abstract3.webp'),
  require('../../assets/images/avatar1.webp'),
  require('../../assets/images/boba.webp'),
  require('../../assets/images/drink1.webp'),
  require('../../assets/images/drink2.webp'),
  require('../../assets/images/drink3.webp'),
  require('../../assets/images/fewleaf.webp'),
  require('../../assets/images/leaf1.webp'),
  require('../../assets/images/leaf2.webp'),
  require('../../assets/images/liquid.webp'),
  require('../../assets/images/promo1.webp'),
  require('../../assets/images/voucherdrink1.png'),
  require('../../assets/images/voucherdrink2.png'),
  require('../../assets/images/voucher20k.png'),
];

const REMOTE_MENU_IMAGES = [
  'https://via.placeholder.com/200/B91C2F/FFFFFF?text=Pearl+Milk+Tea',
  'https://via.placeholder.com/200/8B7355/FFFFFF?text=Taro+Milk+Tea',
  'https://via.placeholder.com/200/8B4513/FFFFFF?text=Brown+Sugar',
  'https://via.placeholder.com/200/FFA500/FFFFFF?text=Passion+Fruit',
  'https://via.placeholder.com/200/FFB6C1/FFFFFF?text=Lychee+Tea',
  'https://via.placeholder.com/200/90EE90/FFFFFF?text=Green+Apple',
  'https://via.placeholder.com/200/FFD700/FFFFFF?text=Mango+Smoothie',
  'https://via.placeholder.com/200/FF69B4/FFFFFF?text=Strawberry',
];

export async function preloadAppAssets() {
  await Promise.all([
    Asset.loadAsync(LOCAL_ASSETS),
    Promise.allSettled(REMOTE_MENU_IMAGES.map((url) => Image.prefetch(url))),
  ]);
}
