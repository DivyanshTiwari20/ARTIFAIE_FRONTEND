import { apiGetWithCache } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const renderValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined) return <Text style={styles.valueNull}>N/A</Text>;
  if (typeof value === 'boolean') return <Text style={styles.valueText}>{value ? 'Yes' : 'No'}</Text>;
  if (typeof value === 'string' || typeof value === 'number') return <Text style={styles.valueText}>{String(value)}</Text>;
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={styles.valueNull}>Empty List</Text>;
    return (
      <View style={styles.nestedContainer}>
        {value.slice(0, 15).map((item, idx) => (
          <View key={idx} style={styles.arrayCard}>
            {renderValue(item)}
          </View>
        ))}
        {value.length > 15 && (
          <Text style={styles.moreText}>...and {value.length - 15} more records</Text>
        )}
      </View>
    );
  }

  if (typeof value === 'object') {
    return (
      <View style={styles.nestedContainer}>
        {Object.entries(value).map(([k, v]) => (
          <View key={k} style={styles.kvRow}>
            <Text style={styles.keyText}>{k}</Text>
            <View style={styles.valueWrapper}>{renderValue(v)}</View>
          </View>
        ))}
      </View>
    );
  }
  
  return <Text style={styles.valueText}>{String(value)}</Text>;
};

const ENDPOINTS = [
  { id: '1', title: 'Test Tally connection (public)', url: '/api/tally/test-public', icon: 'pulse-outline' },
  { id: '2', title: 'Run connection diagnostics', url: '/api/tally/diagnostics', icon: 'analytics-outline' },
  { id: '3', title: 'List companies in Tally', url: '/api/tally/companies', icon: 'business-outline' },
  { id: '4', title: 'Enhanced Trial Balance', url: '/api/tally/trial-balance', icon: 'scale-outline' },
  { id: '5', title: 'List all ledgers', url: '/api/tally/ledgers', icon: 'book-outline' },
  { id: '6', title: 'List all ledger groups', url: '/api/tally/ledger-groups', icon: 'folder-outline' },
  { id: '7', title: 'Day Book report', url: '/api/tally/day-book', icon: 'calendar-outline' },
  { id: '8', title: 'Stock items', url: '/api/tally/stock-items', icon: 'cube-outline' },
  { id: '9', title: 'Stock groups', url: '/api/tally/stock-groups', icon: 'layers-outline' },
  { id: '10', title: 'Vouchers by type (Sales)', url: '/api/tally/vouchers/Sales', icon: 'document-text-outline' },
  { id: '11', title: 'Accounts receivable with ageing', url: '/api/tally/receivables', icon: 'arrow-down-circle-outline' },
  { id: '12', title: 'Accounts payable with TDS', url: '/api/tally/payables', icon: 'arrow-up-circle-outline' },
  { id: '13', title: 'P&L with comparisons', url: '/api/tally/profit-loss', icon: 'trending-up-outline' },
  { id: '14', title: 'GST with filing dates', url: '/api/tally/gst-summary', icon: 'receipt-outline' },
  { id: '15', title: 'Client billing & realisation', url: '/api/tally/client-billing', icon: 'people-outline' },
  { id: '16', title: 'Bank & cash position', url: '/api/tally/bank-position', icon: 'card-outline' },
  { id: '17', title: 'Invoice register with tax', url: '/api/tally/invoice-register', icon: 'list-outline' },
  { id: '18', title: 'Balance sheet with categories', url: '/api/tally/balance-sheet', icon: 'document-outline' },
  { id: '19', title: 'Reports summary', url: '/api/tally/reports/summary', icon: 'stats-chart-outline' },
] as const;

type EndpointState = 'idle' | 'loading' | 'success' | 'error';

type EndpointResult = {
  state: EndpointState;
  summary: string;
  fetchedAt?: string;
  source?: 'local' | 'network';
  stale?: boolean;
  payload?: any;
  error?: string;
};

const formatNumber = (value: number) => {
  return Number(value).toLocaleString('en-IN');
};

const summarizePayload = (payload: any, fallbackCount?: number) => {
  if (!payload) return 'No payload returned';

  if (Array.isArray(payload)) {
    return `${payload.length} records fetched`;
  }

  if (typeof payload === 'object') {
    const summary = payload.summary;
    if (summary && typeof summary === 'object') {
      const summaryKeys = Object.keys(summary).slice(0, 3);
      if (summaryKeys.length > 0) {
        return summaryKeys
          .map((key) => `${key}: ${typeof summary[key] === 'number' ? formatNumber(summary[key]) : String(summary[key])}`)
          .join(' | ');
      }
    }

    if (Array.isArray(payload.data)) {
      return `${payload.data.length} records in data`;
    }

    if (typeof payload.count === 'number') {
      return `${payload.count} total records`;
    }

    const keys = Object.keys(payload).slice(0, 4);
    if (keys.length > 0) {
      return `Fields: ${keys.join(', ')}`;
    }
  }

  if (typeof fallbackCount === 'number') {
    return `${fallbackCount} records fetched`;
  }

  return typeof payload === 'string' ? payload : 'Data fetched successfully';
};

export default function Tally() {
  const [resultMap, setResultMap] = useState<Record<string, EndpointResult>>({});
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const selectedEndpoint = useMemo(() => {
    if (!selectedEndpointUrl) return null;
    return ENDPOINTS.find((endpoint) => endpoint.url === selectedEndpointUrl) || null;
  }, [selectedEndpointUrl]);

  const selectedResult = selectedEndpointUrl ? resultMap[selectedEndpointUrl] : undefined;

  const fetchEndpoint = useCallback(async (url: string, forceRefresh = false) => {
    setResultMap((prev) => ({
      ...prev,
      [url]: {
        ...(prev[url] || { summary: '' }),
        state: 'loading',
      },
    }));

    try {
      const res = await apiGetWithCache(url, {
        forceRefresh,
        ttlMs: 10 * 60 * 1000,
        staleWhileRevalidate: true,
      });

      if (!res?.success) {
        setResultMap((prev) => ({
          ...prev,
          [url]: {
            state: 'error',
            summary: res?.message || 'Failed to fetch',
            error: res?.message || 'Failed to fetch',
            fetchedAt: new Date().toISOString(),
          },
        }));
        return;
      }

      const payload = res?.data;
      setResultMap((prev) => ({
        ...prev,
        [url]: {
          state: 'success',
          summary: summarizePayload(payload, res?.count),
          payload,
          fetchedAt: new Date().toISOString(),
          source: res?._cache?.source,
          stale: res?._cache?.stale,
        },
      }));
    } catch (error: any) {
      setResultMap((prev) => ({
        ...prev,
        [url]: {
          state: 'error',
          summary: error?.message || 'Failed to fetch',
          error: error?.message || 'Failed to fetch',
          fetchedAt: new Date().toISOString(),
        },
      }));
    }
  }, []);

  const fetchAllEndpoints = useCallback(async (forceRefresh = false) => {
    await Promise.all(ENDPOINTS.map((endpoint) => fetchEndpoint(endpoint.url, forceRefresh)));
  }, [fetchEndpoint]);

  useEffect(() => {
    fetchAllEndpoints(false);
  }, [fetchAllEndpoints]);

  const anyLoading = ENDPOINTS.some((endpoint) => resultMap[endpoint.url]?.state === 'loading');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tally Data Integrations</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerSubtitle}>
            Auto-fetch enabled for all endpoints. Tap any card for detailed response.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, anyLoading && { opacity: 0.5 }]}
            disabled={anyLoading}
            onPress={() => fetchAllEndpoints(true)}
          >
            <Ionicons name="refresh" size={16} color="#111827" />
            <Text style={styles.refreshButtonText}>{anyLoading ? 'Refreshing...' : 'Refresh All'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {ENDPOINTS.map((endpoint) => {
            const result = resultMap[endpoint.url];
            const state = result?.state || 'idle';

            return (
              <TouchableOpacity
                key={endpoint.id}
                style={styles.fieldBox}
                activeOpacity={0.8}
                onPress={() => setSelectedEndpointUrl(endpoint.url)}
                onLongPress={() => fetchEndpoint(endpoint.url, true)}
              >
                <View style={styles.fieldIcon}>
                  <Ionicons name={endpoint.icon as any} size={24} color="#333" />
                </View>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldLabel}>{endpoint.title}</Text>

                  {state === 'loading' ? (
                    <Text style={styles.loadingText}>Fetching latest values...</Text>
                  ) : state === 'success' ? (
                    <>
                      <Text style={styles.summaryText}>{result?.summary || 'Data fetched'}</Text>
                      <Text style={styles.metaText}>
                        {result?.source === 'local' ? 'Cache' : 'Cloud'}
                        {result?.stale ? ' (stale)' : ''}
                        {result?.fetchedAt ? ` | ${new Date(result.fetchedAt).toLocaleTimeString()}` : ''}
                      </Text>
                    </>
                  ) : state === 'error' ? (
                    <Text style={styles.errorTextSmall}>{result?.error || 'Failed to load'}</Text>
                  ) : (
                    <Text style={styles.idleText}>Waiting to fetch...</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedEndpointUrl}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedEndpointUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEndpoint?.title || 'Details'}</Text>
              <TouchableOpacity onPress={() => setSelectedEndpointUrl(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalUrl}>{selectedEndpoint?.url}</Text>
            <Text style={styles.modalSummary}>{selectedResult?.summary || 'No data yet'}</Text>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              <Text style={styles.jsonTitle}>Detailed Breakdown</Text>
              {selectedResult?.payload ? (
                <View style={styles.dataViewer}>
                  {renderValue(selectedResult.payload)}
                </View>
              ) : (
                <Text style={styles.idleText}>
                  {selectedResult?.error || 'No payload fetched yet. Pull refresh or wait for auto-fetch.'}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  headerRow: {
    gap: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  metaText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  idleText: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorTextSmall: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 90, // Increased bottom padding
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },
  modalUrl: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  modalSummary: {
    fontSize: 13,
    color: '#111827',
    marginBottom: 10,
  },
  modalBody: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  jsonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  dataViewer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nestedContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  kvRow: {
    flexDirection: 'column',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 6,
  },
  keyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  valueWrapper: {
    paddingLeft: 4,
  },
  arrayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
  },
  valueNull: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  moreText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
