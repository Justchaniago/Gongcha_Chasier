import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface UserAvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  fontSize?: number;
}

// Generate consistent color dari nama user
const getColorFromName = (name: string): string => {
  const colors = [
    '#EF4444', // Red
    '#F59E0B', // Orange
    '#10B981', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Deep Orange
    '#6366F1', // Indigo
    '#06B6D4', // Cyan
  ];

  // Hash nama untuk index yang konsisten
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Extract initials dari nama (max 2 karakter)
const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return 'U';
  
  const parts = name.trim().split(' ');
  
  if (parts.length === 1) {
    // Single word: take first 2 chars
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple words: take first char of first 2 words
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function UserAvatar({ name, photoURL, size = 100, fontSize }: UserAvatarProps) {
  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);
  const calculatedFontSize = fontSize || size * 0.4;

  // Jika ada photoURL, render Image
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    );
  }

  // Fallback: render initial dengan background color
  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: calculatedFontSize,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
