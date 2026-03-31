import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  size?: number;
}

export default function Avatar({ name, size = 40 }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#E8E4F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#6B4EFF',
    fontWeight: '600',
  },
});