import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager, isEmployeeRole, normalizeRole } from '@/lib/roles';
import {
  getBankPosition,
  getClientBilling,
  getClients,
  getEmployees,
  getProfitLoss,
  getReceivables,
  getTaskCounts,
  getTasks,
  onGlobalRefresh,
  updateTaskStatus,
} from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const formatINR = (amount: number): string => {
  if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `\u20B9${(amount / 1000).toFixed(1)}K`;
  return `\u20B9${amount.toFixed(0)}`;
};

interface DashboardStats {
  totalOutstanding: number;
  overdueBills: number;
  totalBills: number;
  mtdCollections: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  revenueChange: number;
  totalLiquidFunds: number;
  totalBankBalance: number;
  totalCashBalance: number;
  totalClients: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalPendingTasks: number;
}

const EMPTY_STATS: DashboardStats = {
  totalOutstanding: 0,
  overdueBills: 0,
  totalBills: 0,
  mtdCollections: 0,
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  netProfitMargin: 0,
  revenueChange: 0,
  totalLiquidFunds: 0,
  totalBankBalance: 0,
  totalCashBalance: 0,
  totalClients: 0,
  paidInvoices: 0,
  unpaidInvoices: 0,
  totalPendingTasks: 0,
};


const HOME_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
let homeDashboardCache: { timestamp: number; data: DashboardStats } | null = null;
let homeEmployeeTaskCache: { timestamp: number; data: any[] } | null = null;

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return { bg: '#DCFCE7', color: '#166534', text: 'Completed' };
    case 'in_progress':
      return { bg: '#DBEAFE', color: '#1D4ED8', text: 'In Progress' };
    case 'cancelled':
      return { bg: '#FEE2E2', color: '#991B1B', text: 'Cancelled' };
    default:
      return { bg: '#F3F4F6', color: '#374151', text: 'Pending' };
  }
};

const statusOptions: { label: string; value: string; icon: string; iconColor: string }[] = [
  { label: 'Update Status', value: 'update_status', icon: 'create-outline', iconColor: '#2563EB' },
  { label: 'Mark Completed', value: 'completed', icon: 'checkmark-circle-outline', iconColor: '#16A34A' },
  { label: 'Mark Pending', value: 'pending', icon: 'time-outline', iconColor: '#6B7280' },
  { label: 'Mark Cancelled', value: 'cancelled', icon: 'close-circle-outline', iconColor: '#DC2626' },
];

export default function Home() {
  const { user, notificationRefreshKey } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DashboardStats>(() => homeDashboardCache?.data || EMPTY_STATS);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>(() => homeEmployeeTaskCache?.data || []);
  const [isLoading, setIsLoading] = useState(() => !homeDashboardCache && !homeEmployeeTaskCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [globalResults, setGlobalResults] = useState<{
    employees: any[];
    tasks: any[];
    clients: any[];
  }>({ employees: [], tasks: [], clients: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Three-dots menu state
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  // Status update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [updateSubTitle, setUpdateSubTitle] = useState('');
  const [updateSubDescription, setUpdateSubDescription] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');

  const isEmployee = isEmployeeRole(user?.role);
  const isManager = user?.role?.toLowerCase() === 'manager';
  const canSeeClientsDirectory = isAdminOrManager(user?.role);
  const canSeeTasks = isEmployee || isManager;

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    if (normalizeRole(user?.role) !== 'admin') {
      setStats(EMPTY_STATS);
      return;
    }

    const requestOptions = {
      forceRefresh,
      staleWhileRevalidate: !forceRefresh,
    };

    const [receivablesRes, plRes, bankRes, billingRes, clientsRes, taskCountsRes] = await Promise.allSettled([
      getReceivables(undefined, undefined, requestOptions),
      getProfitLoss(undefined, undefined, requestOptions),
      getBankPosition(undefined, undefined, requestOptions),
      getClientBilling(undefined, undefined, undefined, requestOptions),
      getClients(requestOptions),
      getTaskCounts(),
    ]);

    const nextStats: DashboardStats = { ...EMPTY_STATS };

    if (receivablesRes.status === 'fulfilled' && receivablesRes.value.success) {
      const data = receivablesRes.value.data;
      nextStats.totalOutstanding = data?.summary?.totalOutstanding || 0;
      nextStats.overdueBills = data?.summary?.overdueBills || 0;
      nextStats.totalBills = data?.summary?.totalBills || 0;
      nextStats.mtdCollections = data?.summary?.mtdCollections || 0;
    }

    if (plRes.status === 'fulfilled' && plRes.value.success) {
      const derived = plRes.value.data?.derived;
      nextStats.totalRevenue = derived?.totalRevenue || 0;
      nextStats.totalExpenses = derived?.totalExpenses || 0;
      nextStats.netProfit = derived?.netProfit || 0;
      nextStats.netProfitMargin = derived?.netProfitMarginPercent || 0;
      nextStats.revenueChange = derived?.revenueVsLastMonth?.changePercent || 0;
    }

    if (bankRes.status === 'fulfilled' && bankRes.value.success) {
      const data = bankRes.value.data;
      nextStats.totalLiquidFunds = data?.derived?.totalLiquidFunds || 0;
      nextStats.totalBankBalance = data?.totalBankBalance || 0;
      nextStats.totalCashBalance = data?.totalCashBalance || 0;
    }

    if (billingRes.status === 'fulfilled' && billingRes.value.success) {
      const data = billingRes.value.data;
      nextStats.paidInvoices = data?.summary?.paidCount || 0;
      nextStats.unpaidInvoices = (data?.summary?.partialCount || 0) + (data?.summary?.unpaidCount || 0);
    }

    if (clientsRes.status === 'fulfilled' && clientsRes.value.success) {
      nextStats.totalClients = clientsRes.value.data?.length || 0;
    }

    if (taskCountsRes.status === 'fulfilled' && taskCountsRes.value.success) {
      const counts = taskCountsRes.value.data;
      nextStats.totalPendingTasks = Number(counts?.pending || 0) + Number(counts?.in_progress || 0);
    }

    setStats(nextStats);
    homeDashboardCache = { timestamp: Date.now(), data: nextStats };

    const staleResponses = [receivablesRes, plRes, bankRes, billingRes].some(
      (result) =>
        result.status === 'fulfilled' &&
        result.value?._cache?.source === 'local' &&
        result.value?._cache?.stale
    );

    if (!forceRefresh && staleResponses) {
      void fetchDashboardData(true);
    }
  }, [user?.role]);

  const fetchEmployeeTasks = useCallback(async (forceRefresh = false) => {
    if (!canSeeTasks) {
      setEmployeeTasks([]);
      return;
    }

    const response = await getTasks({}, { forceRefresh, staleWhileRevalidate: !forceRefresh });
    if (response.success) {
      const nextTasks = response.data || [];
      setEmployeeTasks(nextTasks);
      homeEmployeeTaskCache = { timestamp: Date.now(), data: nextTasks };
    }
  }, [canSeeTasks]);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const hasCachedData = !!homeDashboardCache || !!homeEmployeeTaskCache;
      if (!forceRefresh && !hasCachedData) {
        setIsLoading(true);
      }
      await Promise.all([fetchDashboardData(forceRefresh), fetchEmployeeTasks(forceRefresh)]);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchDashboardData, fetchEmployeeTasks]);

  useEffect(() => {
    loadData(false);
    const intervalId = setInterval(() => {
      loadData(true);
    }, HOME_REFRESH_INTERVAL_MS);

    const unsubscribeGlobal = onGlobalRefresh(() => {
      loadData(true);
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeGlobal();
    };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Auto-refresh when a push notification arrives (via AuthContext)
  useEffect(() => {
    if (notificationRefreshKey > 0) {
      loadData(true);
    }
  }, [notificationRefreshKey]);

  const filteredEmployeeTasks = employeeTasks;

  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGlobalResults({ employees: [], tasks: [], clients: [] });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    const q = query.toLowerCase();

    try {
      const [empRes, taskRes, clientRes] = await Promise.allSettled([
        getEmployees({ staleWhileRevalidate: true }),
        getTasks({}, { staleWhileRevalidate: true }),
        getClients({ staleWhileRevalidate: true }),
      ]);

      const employees = (empRes.status === 'fulfilled' && empRes.value.success)
        ? (empRes.value.data || []).filter((e: any) =>
          (e.name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.role || '').toLowerCase().includes(q)
        ).slice(0, 5)
        : [];

      const tasks = (taskRes.status === 'fulfilled' && taskRes.value.success)
        ? (taskRes.value.data || []).filter((t: any) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.clientName || '').toLowerCase().includes(q)
        ).slice(0, 5)
        : [];

      const clients = (clientRes.status === 'fulfilled' && clientRes.value.success)
        ? (clientRes.value.data || []).filter((c: any) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.contactPerson || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
        ).slice(0, 5)
        : [];

      setGlobalResults({ employees, tasks, clients });
    } catch {
      setGlobalResults({ employees: [], tasks: [], clients: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) {
      setGlobalResults({ employees: [], tasks: [], clients: [] });
      setShowSearchResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      performGlobalSearch(text);
    }, 300);
  }, [performGlobalSearch]);

  const totalResults = globalResults.employees.length + globalResults.tasks.length + globalResults.clients.length;

  const handleQuickStatusUpdate = async (taskId: string, status: string) => {
    try {
      setOpenMenuTaskId(null);
      // Optimistic update
      setEmployeeTasks((prev) => prev.map((t) => ((t.id || t._id) === taskId ? { ...t, status } : t)));

      const res = await updateTaskStatus(taskId, status);
      if (!res.success) {
        // Revert on failure
        await fetchEmployeeTasks(true);
      }
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Could not update task status');
      await fetchEmployeeTasks(true);
    }
  };

  const openStatusUpdateModal = (task: any) => {
    setOpenMenuTaskId(null);
    setEditingTask(task);
    setUpdateSubTitle('');
    setUpdateSubDescription('');
    setUpdateStatus(task.status || 'pending');
    setShowUpdateModal(true);
  };

  const saveStatusUpdate = async () => {
    if (!editingTask) return;
    if (!updateSubTitle.trim()) {
      Alert.alert('Validation', 'Please enter what you are working on');
      return;
    }

    const taskId = editingTask.id || editingTask._id;

    // Optimistic UI Update
    setEmployeeTasks((prev) => prev.map((t) => ((t.id || t._id) === taskId ? { ...t, status: updateStatus } : t)));
    setShowUpdateModal(false);
    setEditingTask(null);

    try {
      const response = await updateTaskStatus(taskId, updateStatus, updateSubTitle.trim(), updateSubDescription.trim() || undefined);

      if (!response.success) {
        Alert.alert('Update failed', response.message || 'Could not update task status');
        await fetchEmployeeTasks(true); // Revert
        return;
      }

      // Fetch in background to sync any other fields
      fetchEmployeeTasks(true);
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Could not update task');
      await fetchEmployeeTasks(true); // Revert
    }
  };

  const toggleMenu = (taskId: string) => {
    setOpenMenuTaskId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>Hi {user?.name || 'User'}</Text>
            <Text style={styles.dashboardTitle}>{isEmployee ? 'My Workboard' : 'Dashboard'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationIconTop} onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={28} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees, tasks, clients..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchResults(false); setGlobalResults({ employees: [], tasks: [], clients: [] }); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {showSearchResults && (
          <View style={styles.searchResultsOverlay}>
            {isSearching ? (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            ) : totalResults === 0 ? (
              <View style={styles.searchEmptyRow}>
                <Ionicons name="search-outline" size={24} color="#9CA3AF" />
                <Text style={styles.searchEmptyText}>No results for "{searchQuery}"</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {globalResults.employees.length > 0 && (
                  <>
                    <Text style={styles.searchSectionTitle}>Employees</Text>
                    {globalResults.employees.map((emp: any) => (
                      <TouchableOpacity
                        key={emp.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                          router.push(`/employee-detail?id=${emp.id}` as any);
                        }}
                      >
                        <View style={[styles.searchResultIcon, { backgroundColor: '#E8E4F3' }]}>
                          <Ionicons name="person" size={16} color="#6B4EFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{emp.name}</Text>
                          <Text style={styles.searchResultSub}>{emp.role} • {emp.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {globalResults.tasks.length > 0 && (
                  <>
                    <Text style={styles.searchSectionTitle}>Tasks</Text>
                    {globalResults.tasks.map((task: any) => {
                      const badge = statusBadge(task.status);
                      return (
                        <TouchableOpacity
                          key={task.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setShowSearchResults(false);
                            setSearchQuery('');
                            router.push(`/task-detail?taskId=${task.id}` as any);
                          }}
                        >
                          <View style={[styles.searchResultIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="document-text" size={16} color="#92400E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.searchResultName}>{task.title}</Text>
                            <Text style={styles.searchResultSub}>{task.clientName || 'No client'} • {badge.text}</Text>
                          </View>
                          <View style={[styles.searchResultBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.searchResultBadgeText, { color: badge.color }]}>{badge.text}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
                {globalResults.clients.length > 0 && (
                  <>
                    <Text style={styles.searchSectionTitle}>Clients</Text>
                    {globalResults.clients.map((client: any) => (
                      <TouchableOpacity
                        key={client.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                          router.push(`/client-detail?id=${client.id}` as any);
                        }}
                      >
                        <View style={[styles.searchResultIcon, { backgroundColor: '#E4F4E8' }]}>
                          <Ionicons name="briefcase" size={16} color="#4CAF50" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{client.name}</Text>
                          <Text style={styles.searchResultSub}>{client.contactPerson || client.email || 'Client'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {error && !homeDashboardCache && !homeEmployeeTaskCache ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorTitle}>Failed to load data</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isLoading && (
              <View style={styles.inlineLoadingRow}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.inlineLoadingText}>Updating latest data...</Text>
              </View>
            )}
            {error && (
              <View style={styles.cachedInfoBanner}>
                <Ionicons name="cloud-offline-outline" size={14} color="#B45309" />
                <Text style={styles.cachedInfoText}>Live refresh failed. Showing cached data.</Text>
              </View>
            )}
            {normalizeRole(user?.role) === 'admin' && (
              <>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Financial Overview</Text>
                    <View
                      style={[
                        styles.changeBadge,
                        { backgroundColor: stats.revenueChange >= 0 ? '#dcfce7' : '#fee2e2' },
                      ]}
                    >
                      <Ionicons
                        name={stats.revenueChange >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={stats.revenueChange >= 0 ? '#16a34a' : '#dc2626'}
                      />
                      <Text
                        style={[
                          styles.changeText,
                          { color: stats.revenueChange >= 0 ? '#16a34a' : '#dc2626' },
                        ]}
                      >
                        {Math.abs(stats.revenueChange).toFixed(1)}% vs last month
                      </Text>
                    </View>
                  </View>
                  <View style={styles.overviewRow}>
                    <View style={styles.overviewItem}>
                      <Text style={styles.overviewLabel}>Revenue</Text>
                      <Text style={styles.overviewValue}>{formatINR(stats.totalRevenue)}</Text>
                    </View>
                    <View style={styles.overviewDivider} />
                    <View style={styles.overviewItem}>
                      <Text style={styles.overviewLabel}>Expenses</Text>
                      <Text style={styles.overviewValue}>{formatINR(stats.totalExpenses)}</Text>
                    </View>
                    <View style={styles.overviewDivider} />
                    <View style={styles.overviewItem}>
                      <Text style={styles.overviewLabel}>Net Profit</Text>
                      <Text
                        style={[
                          styles.overviewValue,
                          { color: stats.netProfit >= 0 ? '#16a34a' : '#dc2626' },
                        ]}
                      >
                        {formatINR(stats.netProfit)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: '#A7F3D0' }]}
                    onPress={() => router.push('/list?tab=clients')}
                  >
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitleColor}>Total Active Clients</Text>
                      <Ionicons name="briefcase-outline" size={22} color="#000" />
                    </View>
                    <Text style={styles.statValueStyle}>{stats.totalClients}</Text>
                    <Text style={styles.statSubtextStyle}>
                      Active directory
                    </Text>
                  </TouchableOpacity>

                  <View style={[styles.statCard, { backgroundColor: '#8ECAFF' }]}>
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitleColor}>Outstanding</Text>
                      <Ionicons name="receipt-outline" size={22} color="#000" />
                    </View>
                    <Text style={styles.statValueStyle}>{formatINR(stats.totalOutstanding)}</Text>
                    <Text style={styles.statSubtextStyle}>{stats.overdueBills} overdue bills</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: '#FDE46E' }]}
                    onPress={() => router.push('/pending-tasks' as any)}
                  >
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitleColor}>Total Pending Tasks</Text>
                      <Ionicons name="document-text-outline" size={22} color="#000" />
                    </View>
                    <Text style={styles.statValueStyle}>{stats.totalPendingTasks}</Text>
                    <Text style={styles.statSubtextStyle}>Tasks to be completed</Text>
                  </TouchableOpacity>

                  <View style={[styles.statCard, { backgroundColor: '#FECACA' }]}>
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitleColor}>Profit Margin</Text>
                      <Ionicons name="analytics-outline" size={22} color="#000" />
                    </View>
                    <Text style={styles.statValueStyle}>{stats.netProfitMargin.toFixed(1)}%</Text>
                    <Text style={styles.statSubtextStyle}>Net profit margin</Text>
                  </View>
                </View>
              </>
            )}

            {!isEmployee && <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Directories</Text>}
            {!isEmployee && (
              <View style={styles.directoryGrid}>
                <TouchableOpacity style={styles.directoryCard} onPress={() => router.push('/list?tab=employees')}>
                  <View style={[styles.directoryIconContainer, { backgroundColor: '#E8E4F3' }]}>
                    <Ionicons name="people" size={24} color="#6B4EFF" />
                  </View>
                  <View style={styles.directoryInfo}>
                    <Text style={styles.directoryTitle}>Employees</Text>
                    <Text style={styles.directoryStats}>View team members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                </TouchableOpacity>

                {canSeeClientsDirectory && (
                  <TouchableOpacity style={styles.directoryCard} onPress={() => router.push('/list?tab=clients')}>
                    <View style={[styles.directoryIconContainer, { backgroundColor: '#E4F4E8' }]}>
                      <Ionicons name="briefcase" size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.directoryInfo}>
                      <Text style={styles.directoryTitle}>Clients</Text>
                      <Text style={styles.directoryStats}>
                        {stats.totalClients > 0 ? `${stats.totalClients} active clients` : 'View all clients'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                  </TouchableOpacity>
                )}

                {/* <TouchableOpacity style={styles.directoryCard} onPress={() => router.push('/invoices' as any)}>
                  <View style={[styles.directoryIconContainer, { backgroundColor: '#FDECE8' }]}>
                    <Ionicons name="receipt" size={24} color="#FF6B6B" />
                  </View>
                  <View style={styles.directoryInfo}>
                    <Text style={styles.directoryTitle}>Invoices</Text>
                    <Text style={styles.directoryStats}>
                      Paid: {stats.paidInvoices} • Due: {stats.unpaidInvoices}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                </TouchableOpacity> */}
              </View>
            )}

            {canSeeTasks && (
              <View style={styles.employeeTaskSection}>
                <Text style={styles.sectionTitle}>{isManager ? 'Team Tasks' : 'My Current Tasks'}</Text>
                {filteredEmployeeTasks.length === 0 ? (
                  <View style={styles.emptyTasksBox}>
                    <Ionicons name="document-text-outline" size={30} color="#9CA3AF" />
                    <Text style={styles.emptyTasksText}>No assigned tasks right now.</Text>
                  </View>
                ) : (
                  filteredEmployeeTasks.map((task) => {
                    const taskId = task.id || task._id;
                    const badge = statusBadge(task.status);
                    const isMenuOpen = openMenuTaskId === taskId;
                    return (
                      <TouchableOpacity
                        key={taskId}
                        style={styles.taskCard}
                        onPress={() => router.push(`/task-detail?taskId=${taskId}` as any)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.taskCardTop}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <View style={styles.taskCardTopRight}>
                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.kebabButton}
                              onPress={() => toggleMenu(taskId)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={styles.taskDescription}>{task.description || 'No description provided.'}</Text>
                        {!!task.clientName && <Text style={styles.taskMeta}>Client: {task.clientName}</Text>}

                        {isMenuOpen && (
                          <View style={styles.menuDropdown}>
                            {statusOptions.map((option) => {
                              // Don't show the option that matches current status
                              if (option.value === task.status) return null;
                              return (
                                <TouchableOpacity
                                  key={option.value}
                                  style={styles.menuItem}
                                  onPress={() => {
                                    if (option.value === 'update_status') {
                                      openStatusUpdateModal(task);
                                    } else {
                                      handleQuickStatusUpdate(taskId, option.value);
                                    }
                                  }}
                                >
                                  <Ionicons name={option.icon as any} size={18} color={option.iconColor} />
                                  <Text style={styles.menuItemText}>{option.label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Status Update Full Screen Page */}
      <Modal visible={showUpdateModal} animationType="slide" transparent={false} onRequestClose={() => setShowUpdateModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F4F6F8' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Top Bar */}
          <View style={styles.updatePageTopBar}>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.updatePageTopBarTitle}>Update Task Status</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.updatePageContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Show original task info as read-only */}
            {editingTask && (
              <View style={styles.originalTaskInfo}>
                <Text style={styles.originalTaskLabel}>Task</Text>
                <Text style={styles.originalTaskTitle}>{editingTask.title}</Text>
                {!!editingTask.description && (
                  <Text style={styles.originalTaskDesc} numberOfLines={2}>{editingTask.description}</Text>
                )}
              </View>
            )}

            <Text style={styles.modalLabel}>What are you working on? <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Filling the taxation forms"
              value={updateSubTitle}
              onChangeText={setUpdateSubTitle}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Details (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              multiline
              placeholder="Any additional details about your progress..."
              value={updateSubDescription}
              onChangeText={setUpdateSubDescription}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusChipsRow}>
              {[
                { label: 'Pending', value: 'pending' as const, color: '#6B7280', bg: '#F3F4F6' },
                { label: 'In Progress', value: 'in_progress' as const, color: '#1D4ED8', bg: '#DBEAFE' },
                { label: 'Completed', value: 'completed' as const, color: '#166534', bg: '#DCFCE7' },
                { label: 'Cancelled', value: 'cancelled' as const, color: '#991B1B', bg: '#FEE2E2' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    updateStatus === option.value && { backgroundColor: option.bg, borderColor: option.color },
                  ]}
                  onPress={() => setUpdateStatus(option.value)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      updateStatus === option.value && { color: option.color, fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionButton, styles.modalCancel]} onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalSave]}
                onPress={saveStatusUpdate}
                disabled={isTaskSaving}
              >
                {isTaskSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Update</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Extra bottom spacing so content isn't hidden behind keyboard */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  greetingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  notificationIconTop: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  searchResultsOverlay: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  searchLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchEmptyRow: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  searchSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  searchResultSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  searchResultBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  searchResultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  inlineLoadingRow: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineLoadingText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  cachedInfoBanner: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cachedInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  overviewCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overviewDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#374151',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statTitleColor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  statValueStyle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  statSubtextStyle: {
    fontSize: 11,
    color: '#333333',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  directoryGrid: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  directoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
  },
  directoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  directoryInfo: {
    flex: 1,
  },
  directoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  directoryStats: {
    fontSize: 13,
    color: '#666666',
  },
  employeeTaskSection: {
    paddingBottom: 26,
  },
  emptyTasksBox: {
    marginHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  emptyTasksText: {
    color: '#6B7280',
    fontSize: 14,
  },
  taskCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  taskCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  taskMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  kebabButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  menuDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  // Update Page (Full Screen)
  updatePageTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  updatePageTopBarTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },
  updatePageContent: {
    padding: 18,
    paddingBottom: 40,
  },
  originalTaskInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  originalTaskLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  originalTaskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  originalTaskDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    fontSize: 14,
    color: '#111827',
  },
  modalTextarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalSave: {
    backgroundColor: '#000000',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});



