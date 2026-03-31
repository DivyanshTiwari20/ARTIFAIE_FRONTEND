import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleCreateTask = () => {
    setIsOpen(false);
    router.push('/create-task');
  };

  const handleCreateClient = () => {
    setIsOpen(false);
    router.push('/create-client');
  };

  return (
    <View style={styles.container}>
      {isOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleCreateClient}>
            <Text style={styles.menuItemText}>Create Client</Text>
            <View style={styles.menuItemIcon}>
              <Ionicons name="person-add" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleCreateTask}>
            <Text style={styles.menuItemText}>Create Task</Text>
            <View style={styles.menuItemIcon}>
              <Ionicons name="documents" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.fab, isOpen && styles.fabOpen]} 
        onPress={toggleOpen}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isOpen ? "close" : "add"} 
          size={32} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  menu: {
    marginBottom: 16,
    alignItems: 'flex-end',
    gap: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabOpen: {
    backgroundColor: '#FF3B30',
  },
});
