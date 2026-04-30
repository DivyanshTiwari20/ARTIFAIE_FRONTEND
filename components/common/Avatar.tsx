import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  size?: number;
  imageUri?: string | null;
}

export default function Avatar({ name, size = 40, imageUri }: AvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const generatedUri = useMemo(() => {
    const encodedName = encodeURIComponent(name || 'User');
    const imgSize = Math.max(128, size * 3);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=E8E4F3&color=111111&size=${imgSize}`;
  }, [name, size]);

  const resolvedUri = imageUri && imageUri.trim() ? imageUri.trim() : generatedUri;

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedUri]);

  if (!hasImageError) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    backgroundColor: '#E8E4F3',
  },
  avatarFallback: {
    backgroundColor: '#E8E4F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#111111',
    fontWeight: '600',
  },
});
