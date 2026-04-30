import { getInvoiceRegister } from '@/services/api';
import { InvoiceListSkeleton } from '@/components/common/Skeleton';
import { InvoiceItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type PaymentFilter = 'All' | 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';

const formatINR = (amount: number): string => {
  if (!amount && amount !== 0) return '₹0';
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  // Handle YYYYMMDD format
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    return `${d}/${m}/${y}`;
  }
  // Handle formatted date
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return { bg: '#dcfce7', text: '#16a34a' };
    case 'Partial': return { bg: '#fef3c7', text: '#d97706' };
    case 'Unpaid': return { bg: '#fee2e2', text: '#dc2626' };
    case 'Overdue': return { bg: '#fecaca', text: '#991b1b' };
    default: return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<PaymentFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState({
    totalInvoices: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
  });

  const filters: PaymentFilter[] = ['All', 'Paid', 'Partial', 'Unpaid', 'Overdue'];

  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const filterParam = selectedFilter === 'All' ? undefined : selectedFilter;
      const res = await getInvoiceRegister(
        undefined,
        undefined,
        undefined,
        filterParam,
        {
          forceRefresh,
          staleWhileRevalidate: !forceRefresh,
        }
      );

      if (res.success) {
        setInvoices(res.data?.invoices || []);
        setSummary(
          res.data?.summary || {
            totalInvoices: 0,
            paidCount: 0,
            partialCount: 0,
            unpaidCount: 0,
            overdueCount: 0,
          }
        );

        if (!forceRefresh && res._cache?.source === 'local' && res._cache?.stale) {
          void fetchInvoices(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchInvoices(false);
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchInvoices(true);
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.clientName?.toLowerCase().includes(q) ||
      inv.voucherNumber?.toLowerCase().includes(q) ||
      inv.narration?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Invoice Register</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#a0a0a0"
        />
      </View>

      {/* Summary Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryContent}
      >
        <View style={[styles.summaryChip, { backgroundColor: '#f0f0f0' }]}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.totalInvoices}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{summary.paidCount}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.summaryLabel}>Partial</Text>
          <Text style={[styles.summaryValue, { color: '#d97706' }]}>{summary.partialCount}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: '#fee2e2' }]}>
          <Text style={styles.summaryLabel}>Unpaid</Text>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{summary.unpaidCount}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: '#fecaca' }]}>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={[styles.summaryValue, { color: '#991b1b' }]}>{summary.overdueCount}</Text>
        </View>
      </ScrollView>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Invoice List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <InvoiceListSkeleton count={5} />
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorTitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.stateText}>No invoices found</Text>
          </View>
        ) : (
          filteredInvoices.map((invoice, index) => {
            const statusColor = getStatusColor(invoice.paymentStatus);
            return (
              <View key={`${invoice.voucherNumber}-${index}`} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceNumber}>{invoice.voucherNumber || '-'}</Text>
                    <Text style={styles.invoiceClient}>{invoice.clientName || 'Unknown'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                      {invoice.paymentStatus}
                    </Text>
                  </View>
                </View>

                {invoice.narration ? (
                  <Text style={styles.invoiceNarration} numberOfLines={1}>
                    {invoice.narration}
                  </Text>
                ) : null}

                <View style={styles.invoiceDetails}>
                  <View style={styles.invoiceDetailItem}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>{formatINR(invoice.grossAmount)}</Text>
                  </View>
                  <View style={styles.invoiceDetailItem}>
                    <Text style={styles.detailLabel}>Received</Text>
                    <Text style={[styles.detailValue, { color: '#16a34a' }]}>
                      {formatINR(invoice.amountReceived)}
                    </Text>
                  </View>
                  <View style={styles.invoiceDetailItem}>
                    <Text style={styles.detailLabel}>Due</Text>
                    <Text style={[styles.detailValue, { color: invoice.outstandingBalance > 0 ? '#dc2626' : '#16a34a' }]}>
                      {formatINR(invoice.outstandingBalance)}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceFooter}>
                  <Text style={styles.invoiceDate}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />{' '}
                    {formatDate(invoice.date)}
                  </Text>
                  {invoice.dueDateFormatted && (
                    <Text style={[
                      styles.invoiceDate,
                      invoice.isOverdue && { color: '#dc2626' }
                    ]}>
                      Due: {invoice.dueDateFormatted}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F4',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
  },
  summaryScroll: {
    maxHeight: 60,
    marginTop: 12,
  },
  summaryContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  filterScroll: {
    maxHeight: 50,
    marginTop: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterChipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  stateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    color: '#333',
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
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  invoiceClient: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceNarration: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  invoiceDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
  },
});


