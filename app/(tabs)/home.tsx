import { dummyNotifications } from '@/data/dummpyData';
import { getClientBilling, getBankPosition, getProfitLoss, getReceivables } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { DashboardSkeleton } from '@/components/common/Skeleton';
import NotificationBadge from '../../components/common/NotificationBadge';
import QuickNotificationModal from '../../components/notification/QuickNotificationModal';
import { useAuth } from '../../context/AuthContext';

// Helper to format Indian currency
const formatINR = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

interface DashboardStats {
  // From receivables
  totalOutstanding: number;
  overdueBills: number;
  totalBills: number;
  mtdCollections: number;
  // From P&L
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  revenueChange: number;
  // From bank position
  totalLiquidFunds: number;
  totalBankBalance: number;
  totalCashBalance: number;
  // From client billing
  totalClients: number;
  paidInvoices: number;
  unpaidInvoices: number;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(dummyNotifications);
  const [showQuickNotifications, setShowQuickNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
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
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      // Fetch all data in parallel
      const [receivablesRes, plRes, bankRes, billingRes] = await Promise.allSettled([
        getReceivables(),
        getProfitLoss(),
        getBankPosition(),
        getClientBilling(),
      ]);

      const newStats: DashboardStats = { ...stats };

      // Process Receivables
      if (receivablesRes.status === 'fulfilled' && receivablesRes.value.success) {
        const data = receivablesRes.value.data;
        newStats.totalOutstanding = data?.summary?.totalOutstanding || 0;
        newStats.overdueBills = data?.summary?.overdueBills || 0;
        newStats.totalBills = data?.summary?.totalBills || 0;
        newStats.mtdCollections = data?.summary?.mtdCollections || 0;
      }

      // Process Profit & Loss
      if (plRes.status === 'fulfilled' && plRes.value.success) {
        const derived = plRes.value.data?.derived;
        if (derived) {
          newStats.totalRevenue = derived.totalRevenue || 0;
          newStats.totalExpenses = derived.totalExpenses || 0;
          newStats.netProfit = derived.netProfit || 0;
          newStats.netProfitMargin = derived.netProfitMarginPercent || 0;
          newStats.revenueChange = derived.revenueVsLastMonth?.changePercent || 0;
        }
      }

      // Process Bank Position
      if (bankRes.status === 'fulfilled' && bankRes.value.success) {
        const data = bankRes.value.data;
        newStats.totalLiquidFunds = data?.derived?.totalLiquidFunds || 0;
        newStats.totalBankBalance = data?.totalBankBalance || 0;
        newStats.totalCashBalance = data?.totalCashBalance || 0;
      }

      // Process Client Billing
      if (billingRes.status === 'fulfilled' && billingRes.value.success) {
        const data = billingRes.value.data;
        const clientRates = data?.clientRealisationRates || [];
        newStats.totalClients = clientRates.length;
        newStats.paidInvoices = data?.summary?.paidCount || 0;
        newStats.unpaidInvoices = (data?.summary?.partialCount || 0) + (data?.summary?.unpaidCount || 0);
      }

      setStats(newStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getLast24HoursNotifications = () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (!Array.isArray(notifications)) return [];
    return notifications.filter((n) => {
      if (!n || !n.createdAt) return false;
      const date = new Date(n.createdAt);
      return !isNaN(date.getTime()) && date > twentyFourHoursAgo;
    });
  };

  const getUnreadCount = () => {
    return getLast24HoursNotifications().filter((n) => !n.isRead).length;
  };

  const handleNotificationPress = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>Hi {user?.name || 'User'} 👋</Text>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationIconTop}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={28} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
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
            {/* Financial Overview Row */}
            {user?.role === 'admin' && (
              <>
                <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <Text style={styles.overviewTitle}>Financial Overview</Text>
                <View style={[
                  styles.changeBadge,
                  { backgroundColor: stats.revenueChange >= 0 ? '#dcfce7' : '#fee2e2' }
                ]}>
                  <Ionicons
                    name={stats.revenueChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={stats.revenueChange >= 0 ? '#16a34a' : '#dc2626'}
                  />
                  <Text style={[
                    styles.changeText,
                    { color: stats.revenueChange >= 0 ? '#16a34a' : '#dc2626' }
                  ]}>
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
                  <Text style={[styles.overviewValue, { color: stats.netProfit >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {formatINR(stats.netProfit)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#A7F3D0' }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statTitleColor}>Liquid Funds</Text>
                  <Ionicons name="wallet-outline" size={22} color="#000" />
                </View>
                <Text style={styles.statValueStyle}>{formatINR(stats.totalLiquidFunds)}</Text>
                <Text style={styles.statSubtextStyle}>
                  Bank: {formatINR(stats.totalBankBalance)} • Cash: {formatINR(stats.totalCashBalance)}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#8ECAFF' }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statTitleColor}>Outstanding</Text>
                  <Ionicons name="receipt-outline" size={22} color="#000" />
                </View>
                <Text style={styles.statValueStyle}>{formatINR(stats.totalOutstanding)}</Text>
                <Text style={styles.statSubtextStyle}>{stats.overdueBills} overdue bills</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FDE46E' }]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statTitleColor}>MTD Collections</Text>
                  <Ionicons name="cash-outline" size={22} color="#000" />
                </View>
                <Text style={styles.statValueStyle}>{formatINR(stats.mtdCollections)}</Text>
                <Text style={styles.statSubtextStyle}>This month received</Text>
              </View>

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

            {/* Directories Section */}
            {user?.role !== 'employee' && (
              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Directories</Text>
            )}
            <View style={styles.directoryGrid}>
              {/* Employee Card */}
              {user?.role !== 'employee' && (
                <TouchableOpacity
                  style={styles.directoryCard}
                  onPress={() => router.push('/list?tab=employees')}
                >
                  <View style={[styles.directoryIconContainer, { backgroundColor: '#E8E4F3' }]}>
                    <Ionicons name="people" size={24} color="#6B4EFF" />
                  </View>
                  <View style={styles.directoryInfo}>
                    <Text style={styles.directoryTitle}>Employees</Text>
                    <Text style={styles.directoryStats}>View team members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                </TouchableOpacity>
              )}

              {/* Client Card */}
              {user?.role === 'admin' && (
                <>
              <TouchableOpacity
                style={styles.directoryCard}
                onPress={() => router.push('/list?tab=clients')}
              >
                <View style={[styles.directoryIconContainer, { backgroundColor: '#E4F4E8' }]}>
                  <Ionicons name="briefcase" size={24} color="#4CAF50" />
                </View>
                <View style={styles.directoryInfo}>
                  <Text style={styles.directoryTitle}>Clients</Text>
                  <Text style={styles.directoryStats}>
                    {stats.totalClients > 0 ? `${stats.totalClients} active clients` : 'View client billing'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* Invoice Card */}
              <TouchableOpacity
                style={styles.directoryCard}
                onPress={() => router.push('/invoices' as any)}
              >
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
              </TouchableOpacity>
              </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Quick Notification Modal removed as notification bell is updated to settings */}
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
    position: 'relative',
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
  content: {
    flex: 1,
  },
  // Loading & Error States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
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
  // Financial Overview Card
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
  // Stats Grid
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
});