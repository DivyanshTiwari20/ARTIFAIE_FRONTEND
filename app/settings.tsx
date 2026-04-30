import Avatar from '@/components/common/Avatar';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Settings() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This will permanently delete your account. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Confirm deletion', 'Are you sure you want to delete your account?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete account',
              style: 'destructive',
              onPress: async () => {
                const result = await deleteAccount();
                if (result.success) {
                  router.replace('/');
                } else {
                  Alert.alert('Could not delete account', result.message || 'Please contact support.');
                }
              },
            },
          ]);
        },
      },
    ]);
  };

  const settingsOptions = [
    {
      id: 'security',
      title: 'Update Password',
      icon: 'shield-checkmark-outline',
      onPress: () => router.push('/update-password'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => router.push('/help-support'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'document-text-outline',
      onPress: () => router.push('/privacy-policy'),
    },
    {
      id: 'faq',
      title: 'FAQs',
      icon: 'newspaper-outline',
      onPress: () => router.push('/faq'),
    },
    {
      id: 'about',
      title: 'About',
      icon: 'information-circle-outline',
      onPress: () => router.push('/about'),
    },
  ];

  if (isAdminOrManager(user?.role)) {
    settingsOptions.push({
      id: 'employee-list',
      title: 'Employee List',
      icon: 'people-outline',
      onPress: () => router.push('/employee-list'),
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Avatar name={user?.name || 'User'} size={60} imageUri={user?.profileImageUrl || user?.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileRole}>{user?.role || 'Role'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {settingsOptions.map((option) => (
            <TouchableOpacity key={option.id} style={styles.settingItem} onPress={option.onPress} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon as any} size={22} color="#666666" />
                </View>
                <Text style={styles.settingTitle}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color="#C62828" />
          <Text style={styles.deleteAccountButtonText}>Delete account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  profileEmail: {
    fontSize: 13,
    color: '#999999',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteAccountButtonText: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999999',
    marginTop: 20,
    marginBottom: 40,
  },
});
