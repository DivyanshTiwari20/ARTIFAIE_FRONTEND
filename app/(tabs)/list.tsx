import EmployeeCard from '@/components/list/EmployeeCard';
import { ListSkeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { getClients, getEmployees } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type ListTab = 'employees' | 'clients';

const formatINR = (amount: number): string => {
  if (!amount && amount !== 0) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return '₹' + amount.toLocaleString('en-IN');
};

export default function List() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (params.tab === 'clients' ? 'clients' : 'employees') as ListTab;
  const [activeTab, setActiveTab] = useState<ListTab>(initialTab);
  const [search, setSearch] = useState('');

  // Employee data from Backend
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // Client data from Tally
  const [clients, setClients] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (params.tab === 'clients' || params.tab === 'employees') {
      setActiveTab(params.tab as ListTab);
    }
  }, [params.tab]);

  const fetchClients = useCallback(async () => {
    try {
      setClientsError(null);
      setIsLoadingClients(true);
      const res = await getClients();
      if (res.success) {
        setClients(res.data || []);
      }
    } catch (err: any) {
      setClientsError(err.message || 'Failed to load clients');
    } finally {
      setIsLoadingClients(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesError(null);
      setIsLoadingEmployees(true);
      const res = await getEmployees();
      if (res.success) {
        setEmployees(res.data || []);
      }
    } catch (err: any) {
      setEmployeesError(err.message || 'Failed to load employees');
    } finally {
      setIsLoadingEmployees(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'clients') {
        fetchClients();
      } else if (activeTab === 'employees') {
        if (isAdminOrManager(user?.role)) {
          fetchEmployees();
        }
      }
    }, [activeTab])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (activeTab === 'clients') {
      fetchClients();
    } else {
      fetchEmployees();
    }
  }, [activeTab, fetchClients, fetchEmployees]);

  // Employee search on real data
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(emp =>
      emp.name?.toLowerCase().includes(q)
      || emp.email?.toLowerCase().includes(q)
      || emp.role?.toLowerCase().includes(q)
    );
  }, [search, employees]);

  // Client search on real data
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((client) => {
      const name = client?.name || '';
      return name.toLowerCase().includes(q);
    });
  }, [search, clients]);

  // Check if user has access
  const hasAccess = isAdminOrManager(user?.role);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lists</Text>
        </View>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            Only Admins and Managers can access this section
          </Text>
        </View>
      </View>
    );
  }

  const handleEmployeePress = (employeeId: string) => {
    router.push(`/employee-detail?id=${employeeId}`);
  };

  const handleAssignTask = (employeeId: string, employeeName: string) => {
    router.push(`/assign-task?employeeId=${employeeId}&employeeName=${employeeName}`);
  };

  const handleClientPress = (clientId: string, clientName: string) => {
    router.push(`/client-detail?id=${clientId}&clientName=${encodeURIComponent(clientName)}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lists</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab === 'employees' ? 'employees' : 'clients'}...`}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#a0a0a0"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.tabActive]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.tabTextActive]}>
            Employees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>
            Clients
          </Text>
        </TouchableOpacity>
      </View>

      {/* List Content */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'employees' ? (
          <>
            {isLoadingEmployees ? (
              <ListSkeleton count={5} />
            ) : employeesError ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
                <Text style={styles.stateText}>{employeesError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchEmployees}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.countText}>{filteredEmployees.length} Employees</Text>
                {filteredEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id || employee._id}
                    employee={{...employee, phone: employee.phone || employee.department}}
                    onPress={() => handleEmployeePress(employee.id || employee._id)}
                    onAssignTask={() => handleAssignTask(employee.id || employee._id, employee.name)}
                    showAssignButton={true}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {isLoadingClients ? (
              <ListSkeleton count={5} />
            ) : clientsError ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
                <Text style={styles.stateText}>{clientsError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchClients}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.countText}>{filteredClients.length} Clients</Text>
                {filteredClients.map((client, index) => (
                  <TouchableOpacity
                    key={`${client.id || client.name}-${index}`}
                    style={styles.realClientCard}
                    onPress={() => handleClientPress(client.id, client.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clientCardHeader}>
                      <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>
                          {client.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clientCardName} numberOfLines={1}>
                          {client.name}
                        </Text>
                        <Text style={styles.clientRealisation}>
                          {client.email || 'No email'} | {client.phone || 'No phone'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </View>

                    <View style={styles.clientCardStats}>
                      <View style={styles.clientStatItem}>
                        <Text style={styles.clientStatLabel}>Location</Text>
                        <Text style={styles.clientStatValue} numberOfLines={1}>{client.location || 'N/A'}</Text>
                      </View>
                      <View style={styles.clientStatItem}>
                        <Text style={styles.clientStatLabel}>Contact Person</Text>
                        <Text style={styles.clientStatValue} numberOfLines={1}>
                          {client.contactPerson || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 2,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    height: 42,
    borderRadius: 9,
    backgroundColor: '#F1F1F4',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000000',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  countText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    fontWeight: '500',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Loading & Error states
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  stateText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Real Client Cards
  realClientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E4F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B4EFF',
  },
  clientCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  clientRealisation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  clientCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  clientStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  clientStatLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  clientStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});