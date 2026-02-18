# Image Assets

## How to Add Your Own Images

### 1. Avatar (Profile Picture)
- **Filename**: `avatar.jpg` or `avatar.png`
- **Size**: 150x150px recommended (will be shown as 48x48 circle)
- **Location**: Place in this folder (`assets/images/avatar.jpg`)

**After adding your image, in App.tsx:**
- Uncomment line: `<Image source={require('./assets/images/avatar.jpg')} style={styles.avatar} />`
- Comment out the line with `uri: 'https://i.pravatar.cc/150?u=ferry'`

---

### 2. Promo Carousel Cards (3 images)
- **Filenames**: 
  - `promo1.jpg` - Buy 1 Get 1 Free offer
  - `promo2.jpg` - Double Points offer
  - `promo3.jpg` - New Arrival offer
- **Size**: 1200x800px recommended (landscape orientation)
- **Location**: Place all 3 in this folder

**After adding your images, in App.tsx:**

1. Update the array to include image sources:
```javascript
{ color: '#B91C2F', title: 'Buy 1 Get 1 Free', desc: 'Pearl Milk Tea Series', image: require('./assets/images/promo1.jpg') },
{ color: '#D4A853', title: 'Double Points', desc: 'Every Weekend Promo', image: require('./assets/images/promo2.jpg') },
{ color: '#2A1F1F', title: 'New Arrival', desc: 'Matcha Brown Sugar Latte', image: require('./assets/images/promo3.jpg') }
```

2. Uncomment the Image component inside the promo card JSX

---

## Supported Formats
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

## Notes
- Keep file sizes under 500KB for optimal performance
- Use high-quality images (they'll be scaled down automatically)
- The app will hot-reload automatically after you save images
