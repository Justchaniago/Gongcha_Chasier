import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, StyleSheet, Modal, Animated, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';

// Real Gong Cha Menu Data
interface MenuItem {
  id: string;
  name: string;
  category: 'Signature' | 'MilkTea' | 'Coffee' | 'Matcha' | 'Mint' | 'BrownSugar' | 'CreativeMix' | 'BrewedTea';
  mediumPrice: number;  // M price (smallest / base)
  availableLarge: boolean;  // L available? (L = M + 2k)
  availableHot?: boolean;  // Hot version available?
  image?: string;
  rating?: number;
}

const GONGCHA_MENU: MenuItem[] = [
  // SIGNATURE SERIES
  { id: 's1', name: 'Gong Cha Tea', category: 'Signature', mediumPrice: 29, availableLarge: true, availableHot: false },
  { id: 's2', name: 'Gong Cha Wintermelon', category: 'Signature', mediumPrice: 29, availableLarge: true, availableHot: false },
  { id: 's3', name: 'Gong Cha Milk Coffee', category: 'Signature', mediumPrice: 35, availableLarge: false, availableHot: false },
  { id: 's4', name: 'Gong Cha Milo', category: 'Signature', mediumPrice: 35, availableLarge: false, availableHot: false },

  // MILK TEA SERIES
  { id: 'm1', name: 'Milk Tea', category: 'MilkTea', mediumPrice: 28, availableLarge: true, availableHot: true },
  { id: 'm2', name: 'Pearl Milk Tea', category: 'MilkTea', mediumPrice: 32, availableLarge: true, availableHot: true },
  { id: 'm3', name: 'Milk Tea w Herbal Jelly', category: 'MilkTea', mediumPrice: 32, availableLarge: true, availableHot: false },
  { id: 'm4', name: 'Earl Grey Milk Tea', category: 'MilkTea', mediumPrice: 37, availableLarge: true, availableHot: false },
  { id: 'm5', name: 'Taro Milk', category: 'MilkTea', mediumPrice: 35, availableLarge: true, availableHot: true },
  { id: 'm6', name: 'Chocolate Milk', category: 'MilkTea', mediumPrice: 35, availableLarge: true, availableHot: true },
  { id: 'm7', name: 'Strawberry Milk Tea', category: 'MilkTea', mediumPrice: 39, availableLarge: true, availableHot: false },

  // COFFEE SERIES
  { id: 'c1', name: 'Black Coffee', category: 'Coffee', mediumPrice: 28, availableLarge: false, availableHot: false },
  { id: 'c2', name: 'Dolce Milk Coffee', category: 'Coffee', mediumPrice: 26, availableLarge: false, availableHot: false },

  // MATCHA SERIES
  { id: 'mt1', name: 'Matcha Latte', category: 'Matcha', mediumPrice: 35, availableLarge: true, availableHot: false },
  { id: 'mt2', name: 'Matcha Milk Tea w Foam', category: 'Matcha', mediumPrice: 41, availableLarge: false, availableHot: false },

  // MINT SERIES
  { id: 'min1', name: 'Mint Choco Smoothie', category: 'Mint', mediumPrice: 52, availableLarge: false, availableHot: false },
  { id: 'min2', name: 'Mint Choco Milk Tea w Pearl', category: 'Mint', mediumPrice: 45, availableLarge: false, availableHot: false },

  // BROWN SUGAR SERIES
  { id: 'bs1', name: 'Brown Sugar Milk Tea w Pearl', category: 'BrownSugar', mediumPrice: 39, availableLarge: true, availableHot: true },
  { id: 'bs2', name: 'Brown Sugar Milk Coffee', category: 'BrownSugar', mediumPrice: 35, availableLarge: false, availableHot: false },
  { id: 'bs3', name: 'Brown Sugar Fresh Milk w Pearl', category: 'BrownSugar', mediumPrice: 39, availableLarge: true, availableHot: true },

  // CREATIVE MIX SERIES
  { id: 'cm1', name: 'OO Passion Fruit Green Tea', category: 'CreativeMix', mediumPrice: 42, availableLarge: true, availableHot: false },
  { id: 'cm2', name: 'Lemon Juice w White Pearl & Aiyu', category: 'CreativeMix', mediumPrice: 42, availableLarge: true, availableHot: false },
  { id: 'cm3', name: 'Passion Fruit Peach Green Tea', category: 'CreativeMix', mediumPrice: 34, availableLarge: true, availableHot: false },
  { id: 'cm4', name: 'Peach Green Tea', category: 'CreativeMix', mediumPrice: 32, availableLarge: true, availableHot: false },
  { id: 'cm5', name: 'Lemon Wintermelon', category: 'CreativeMix', mediumPrice: 32, availableLarge: true, availableHot: false },
  { id: 'cm6', name: 'Green Tea Yakult', category: 'CreativeMix', mediumPrice: 31, availableLarge: true, availableHot: false },
  { id: 'cm7', name: 'Mango Yakult', category: 'CreativeMix', mediumPrice: 33, availableLarge: true, availableHot: true },

  // BREWED TEA SERIES
  { id: 'bt1', name: 'Black Tea', category: 'BrewedTea', mediumPrice: 24, availableLarge: true, availableHot: false },
  { id: 'bt2', name: 'Oolong Tea', category: 'BrewedTea', mediumPrice: 25, availableLarge: true, availableHot: false },
  { id: 'bt3', name: 'Green Tea', category: 'BrewedTea', mediumPrice: 24, availableLarge: true, availableHot: false },
  { id: 'bt4', name: 'Alisan Tea', category: 'BrewedTea', mediumPrice: 25, availableLarge: true, availableHot: false },
  { id: 'bt5', name: 'Wintermelon Tea', category: 'BrewedTea', mediumPrice: 24, availableLarge: true, availableHot: false },
];

const CATEGORY_LABELS: Record<string, string> = {
  Signature: 'Signature',
  MilkTea: 'Milk Tea',
  Coffee: 'Coffee',
  Matcha: 'Matcha',
  Mint: 'Mint',
  BrownSugar: 'Brown Sugar',
  CreativeMix: 'Creative Mix',
  BrewedTea: 'Brewed Tea',
};

const CATEGORIES = ['All', 'Signature', 'MilkTea', 'Coffee', 'Matcha', 'Mint', 'BrownSugar', 'CreativeMix', 'BrewedTea'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const filteredMenu = selectedCategory === 'All' 
    ? GONGCHA_MENU
    : GONGCHA_MENU.filter(item => item.category === selectedCategory);
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const onOpenModal = (item: MenuItem) => {
    setSelectedProduct(item);
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onCloseModal = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedProduct(null);
    });
  };

  const renderCategoryPill = (category: string) => {
    const isActive = selectedCategory === category;
    const displayLabel = CATEGORY_LABELS[category] || category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text 
          style={[styles.categoryText, isActive && styles.categoryTextActive]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }: { item: MenuItem }) => {
    const isFavorite = favorites.includes(item.id);
    const largeNote = item.availableLarge ? `Upsize + ${formatPrice(2000)}` : '';
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => onOpenModal(item)}
      >
        <View style={styles.imageContainer}>
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>🥤</Text>
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Heart 
              size={20} 
              color={isFavorite ? '#B91C2F' : 'white'} 
              fill={isFavorite ? '#B91C2F' : 'none'}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>{formatPrice(item.mediumPrice * 1000)}</Text>
          </View>
          <View style={styles.pillRow}>
            <View style={[styles.pill, styles.icePill]}>
              <Text style={styles.pillText}>🧊 ICE</Text>
            </View>
            {item.availableHot && (
              <View style={[styles.pill, styles.hotPill]}>
                <Text style={styles.pillText}>🔥 HOT</Text>
              </View>
            )}
          </View>
          {largeNote && <Text style={styles.upsizeCaption}>↑ {largeNote}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

      <View style={[styles.container, { paddingTop: insets.top + 4 }]}> 
      
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSubtitle}>Discover our signature drinks</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryScrollContent, { paddingHorizontal: horizontalPadding }]}
        >
          {CATEGORIES.map(renderCategoryPill)}
        </ScrollView>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredMenu}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[styles.productGrid, { paddingHorizontal: horizontalPadding, paddingBottom: 100 + insets.bottom }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {/* Product Detail Modal */}
      <Modal
        transparent
        visible={!!selectedProduct}
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={onCloseModal}
      >
        <TouchableWithoutFeedback onPress={onCloseModal}>
          <Animated.View style={[styles.modalOverlay, { opacity: opacityValue }]}>
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
              <View style={styles.modalOverlayContent}>
                <TouchableWithoutFeedback>
                  <Animated.View 
                style={[
                  styles.modalContent,
                  { transform: [{ scale: scaleValue }] }
                ]}
              >
                {selectedProduct && (
                  <>
                    {/* Close Button */}
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={onCloseModal}
                    >
                      <X size={24} color="#2A1F1F" />
                    </TouchableOpacity>

                    {/* Product Emoji Icon */}
                    <View style={styles.modalImage}>
                      <Text style={styles.modalEmoji}>🥤</Text>
                    </View>

                    {/* Product Details */}
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                      <View style={styles.modalPriceRow}>
                        <Text style={styles.modalPrice}>{formatPrice(selectedProduct.mediumPrice * 1000)}</Text>
                        {selectedProduct.availableLarge && (
                          <Text style={styles.modalLargeNote}> Upsize + {formatPrice(2000)}</Text>
                        )}
                      </View>
                      <View style={styles.modalPillRow}>
                        <View style={[styles.pill, styles.icePill]}>
                          <Text style={styles.pillText}>🧊 ICE</Text>
                        </View>
                        {selectedProduct.availableHot && (
                          <View style={[styles.pill, styles.hotPill]}>
                            <Text style={styles.pillText}>🔥 HOT</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.modalCategory}>{CATEGORY_LABELS[selectedProduct.category]}</Text>

                      <Text style={styles.modalDescription}>
                        Enjoy our signature drink made with premium ingredients. 
                        Perfectly crafted to satisfy your cravings with authentic flavors and quality ingredients.
                      </Text>
                    </View>
                  </>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
              </View>
            </BlurView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
      </View>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8C7B75',
    marginTop: 4,
  },
  categoryContainer: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 42,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B91C2F',
    backgroundColor: 'transparent',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#B91C2F',
    borderColor: '#B91C2F',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C2F',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  productGrid: {
    paddingHorizontal: 20,
    paddingBottom: 84,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(42, 31, 31, 0.6)',
    padding: 8,
    borderRadius: 20,
  },
  productInfo: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A1F1F',
    marginBottom: 10,
    lineHeight: 20,
    minHeight: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C2F',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  icePill: {
    backgroundColor: '#D9F1FF',
  },
  hotPill: {
    backgroundColor: '#FFE3DD',
  },
  upsizeCaption: {
    marginTop: 6,
    fontSize: 11,
    color: '#6F5E57',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillText: {
    fontSize: 11,
    color: '#2A1F1F',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 31, 31, 0.4)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 80,
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 12,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#B91C2F',
  },
  modalLargeNote: {
    fontSize: 13,
    color: '#6F5E57',
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  modalPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCategory: {
    fontSize: 14,
    color: '#8C7B75',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8C7B75',
    lineHeight: 22,
  },
});
