import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

import { getEmployees } from '@/services/api';

// Removed manual work status dropdown component because work status applies to tasks, not employees in DB.

export default function EmployeeList() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getEmployees();
        if (res.success) {
          setEmployees(res.data);
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity> */}
        <Text style={styles.title}>Employee List</Text>
        <Text style={styles.subtitle}>
          Review employee details and update work status.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, { flex: 0.5 }]}>
                S.No
              </Text>
              <Text style={[styles.cell, styles.headerCell]}>Name</Text>
              <Text style={[styles.cell, styles.headerCell]}>Email</Text>
              <Text style={[styles.cell, styles.headerCell]}>Role</Text>
              <Text style={[styles.cell, styles.headerCell]}>Department</Text>
              <Text style={[styles.cell, styles.headerCell]}>Joined</Text>
              <Text style={[styles.cell, styles.headerCell]}>System Access</Text>
            </View>

            {employees.map((employee, index) => (
              <View key={employee.id} style={[styles.row, styles.dataRow]}>
                <Text style={[styles.cell, { flex: 0.5 }]}>{index + 1}</Text>
                <Text style={styles.cell}>{employee.name}</Text>
                <Text style={styles.cell}>{employee.email}</Text>
                <Text style={styles.cell}>{employee.role?.toUpperCase()}</Text>
                <Text style={styles.cell}>{employee.department || '-'}</Text>
                <Text style={styles.cell}>
                  {new Date(employee.createdAt).toLocaleDateString()}
                </Text>
                <View style={[styles.cell, styles.statusCell]}>
                  <View
                    style={[
                      styles.statusBadge,
                      employee.isActive ? statusStyles.completed.badge : statusStyles.cancelled.badge
                    ]}
                  >
                    <Text style={employee.isActive ? statusStyles.completed.text : statusStyles.cancelled.text}>
                      {employee.isActive ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}



const statusStyles: Record<
  string,
  { badge: object; text: object }
> = {
  pending: {
    badge: { backgroundColor: '#FFF7E6', borderColor: '#FFB020' },
    text: { color: '#C77700', fontWeight: '600' },
  },
  cancelled: {
    badge: { backgroundColor: '#FFEAEA', borderColor: '#FF3B30' },
    text: { color: '#C1271A', fontWeight: '600' },
  },
  completed: {
    badge: { backgroundColor: '#E8F9F0', borderColor: '#34C759' },
    text: { color: '#1E9B46', fontWeight: '600' },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 900,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 12,
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
  },
  dataRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  cell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111111',
  },
  headerCell: {
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontSize: 12,
  },
  statusCell: {
    flexDirection: 'column',
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusButtonActive: {
    backgroundColor: '#E0ECFF',
    borderColor: '#5A8CFF',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#1F1F1F',
    fontWeight: '600',
  },
  statusDropdownButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    minWidth: 115,
  },
  statusDropdownButtonText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.11)',
  },
  dropdownContainer: {
    width: 230,
    backgroundColor: '#fff',
    borderRadius: 11,
    paddingVertical: 15,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: '#E3E9F3',
  },
  dropdownTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 9,
    letterSpacing: 0.2,
    color: '#213146',
  },
  dropdownOption: {
    paddingVertical: 8,
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 7,
    marginBottom: 2,
  },
  dropdownOptionSelected: {
    backgroundColor: '#F3F7FB',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#222B3C',
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },
  dropdownOptionTextSelected: {
    color: '#3578e5',
  },
});