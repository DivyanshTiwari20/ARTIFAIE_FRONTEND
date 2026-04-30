import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={styles.updatedAt}>Last updated: March 31, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect account information (name, email, role), app usage data required for task management, and optional
            notification tokens to deliver important updates.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Data</Text>
          <Text style={styles.sectionText}>
            Data is used to authenticate users, assign tasks, show dashboards, and support operational workflows between
            admins, managers, and employees.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Access and Role Controls</Text>
          <Text style={styles.sectionText}>
            Access to data is controlled by role-based permissions. Employees can only access their own tasks and profile
            information relevant to assigned work.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Security</Text>
          <Text style={styles.sectionText}>
            We use authenticated API access and token-based sessions. We recommend using strong passwords and keeping devices
            updated to reduce security risk.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention and Deletion</Text>
          <Text style={styles.sectionText}>
            Account and task records are retained for operational reporting. You may request account deletion from Settings.
            Some records may be retained as required for compliance or audit history.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  updatedAt: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
});
