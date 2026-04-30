import EmployeeCard from '@/components/list/EmployeeCard';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { getClients, getEmployees } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ListTab = 'employees' | 'clients';

type BackendClient = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  contactPerson?: string;
  createdAt?: string;
};

let clientsMemoryCache: BackendClient[] | null = null;
let employeesMemoryCache: any[] | null = null;

export default function List() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab = (params.tab === 'clients' ? 'clients' : 'employees') as ListTab;
  const [activeTab, setActiveTab] = useState<ListTab>(initialTab);
  const [search, setSearch] = useState('');

  const [employees, setEmployees] = useState<any[]>(() => employeesMemoryCache || []);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(() => !employeesMemoryCache);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [clients, setClients] = useState<BackendClient[]>(() => clientsMemoryCache || []);
  const [isLoadingClients, setIsLoadingClients] = useState(() => !clientsMemoryCache);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (params.tab === 'clients' || params.tab === 'employees') {
      setActiveTab(params.tab as ListTab);
    }
  }, [params.tab]);

  const fetchClients = useCallback(async (forceRefresh = false) => {
    try {
      setClientsError(null);
      if (!clientsMemoryCache || forceRefresh) {
        setIsLoadingClients(true);
      }

      const res = await getClients({
        forceRefresh,
        staleWhileRevalidate: !forceRefresh,
      });

      if (res.success) {
        const nextClients = (res.data || []) as BackendClient[];
        setClients(nextClients);
        clientsMemoryCache = nextClients;
      } else {
        setClients([]);
      }
    } catch (err: any) {
      setClientsError(err.message || 'Failed to load clients');
    } finally {
      setIsLoadingClients(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    try {
      setEmployeesError(null);
      if (!employeesMemoryCache || forceRefresh) {
        setIsLoadingEmployees(true);
      }

      const res = await getEmployees({
        forceRefresh,
        staleWhileRevalidate: !forceRefresh,
      });

      if (res.success) {
        const nextEmployees = res.data || [];
        setEmployees(nextEmployees);
        employeesMemoryCache = nextEmployees;
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      setEmployeesError(err.message || 'Failed to load employees');
    } finally {
      setIsLoadingEmployees(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'clients' && clients.length === 0) {
      void fetchClients(false);
    } else if (activeTab === 'employees' && employees.length === 0 && isAdminOrManager(user?.role)) {
      void fetchEmployees(false);
    }
  }, [activeTab, clients.length, employees.length, fetchClients, fetchEmployees, user?.role]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (activeTab === 'clients') {
      void fetchClients(true);
    } else {
      void fetchEmployees(true);
    }
  }, [activeTab, fetchClients, fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    let result = [...employees];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.role?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [search, employees]);

  const filteredClients = useMemo(() => {
    let result = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((client) => {
        const haystack = `${client?.name || ''} ${client?.email || ''} ${client?.phone || ''} ${client?.location || ''} ${client?.contactPerson || ''}`;
        return haystack.toLowerCase().includes(q);
      });
    }
    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [search, clients]);

  const hasAccess = isAdminOrManager(user?.role);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lists</Text>
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed-outline" size={64} color="#999" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>Only Admins and Managers can access this section</Text>
        </View>
      </View>
    );
  }

  const handleEmployeePress = (employeeId: string, employee: any) => {
    router.push(
      `/employee-detail?id=${employeeId}&name=${encodeURIComponent(employee.name || '')}&role=${encodeURIComponent(
        employee.role || ''
      )}&avatar=${encodeURIComponent(employee.profileImageUrl || employee.avatar || '')}`
    );
  };

  const handleAssignTask = (employeeId: string, employeeName: string) => {
    router.push(`/assign-task?employeeId=${employeeId}&employeeName=${employeeName}`);
  };

  const handleClientPress = (client: BackendClient) => {
    const clientId = client.id || client._id;
    if (!clientId) return;
    router.push(`/client-detail?id=${clientId}&clientName=${encodeURIComponent(client.name || '')}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lists</Text>
      </View>

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

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.tabActive]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.tabTextActive]}>Employees</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'employees' ? (
          <>
            {isLoadingEmployees ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.stateText}>Loading employees...</Text>
              </View>
            ) : employeesError ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
                <Text style={styles.stateText}>{employeesError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchEmployees(true)}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.countText}>{filteredEmployees.length} Employees</Text>
                {filteredEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id || employee._id}
                    employee={{ ...employee, phone: employee.phone || employee.department }}
                    onPress={() => handleEmployeePress(employee.id || employee._id, employee)}
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
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.stateText}>Loading clients...</Text>
              </View>
            ) : clientsError ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
                <Text style={styles.stateText}>{clientsError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchClients(true)}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.countText}>{filteredClients.length} Clients</Text>
                {filteredClients.map((client, index) => {
                  const clientId = client.id || client._id || String(index);
                  return (
                    <TouchableOpacity
                      key={clientId}
                      style={styles.realClientCard}
                      onPress={() => handleClientPress(client)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.clientCardHeader}>
                        <View style={styles.clientAvatar}>
                          <Text style={styles.clientAvatarText}>{client.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clientCardName} numberOfLines={1}>
                            {client.name || 'Unnamed Client'}
                          </Text>
                          <Text style={styles.clientSubTitle} numberOfLines={1}>
                            {client.email || client.phone || 'No contact info'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                      </View>

                      <View style={styles.clientCardStats}>
                        <View style={styles.clientStatItem}>
                          <Text style={styles.clientStatLabel}>Phone</Text>
                          <Text style={styles.clientStatValue} numberOfLines={1}>{client.phone || '-'}</Text>
                        </View>
                        <View style={styles.clientStatItem}>
                          <Text style={styles.clientStatLabel}>Location</Text>
                          <Text style={styles.clientStatValue} numberOfLines={1}>{client.location || '-'}</Text>
                        </View>
                        <View style={styles.clientStatItem}>
                          <Text style={styles.clientStatLabel}>Contact</Text>
                          <Text style={styles.clientStatValue} numberOfLines={1}>{client.contactPerson || '-'}</Text>
                        </View>
                      </View>

                      <Text style={styles.clientCreatedAt}>
                        Added: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
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
  clientSubTitle: {
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
    paddingHorizontal: 2,
  },
  clientStatLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  clientStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },
  clientCreatedAt: {
    fontSize: 12,
    color: '#6B7280',
  },
});
