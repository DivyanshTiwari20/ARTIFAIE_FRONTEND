// services/api.ts
// Central API client for communicating with the tally-backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ==========================================
// CONFIGURE YOUR BACKEND URL HERE
// ==========================================
// For local development: 'http://192.168.18.5:5000' (your machine's current LAN IP)
// For AWS deployment: 'http://15.206.49.18:5000'
const API_BASE_URL = 'http://15.206.49.18:5000'; // Reverted to HTTP temporarily for Path A testing/production

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ------------------------------------------
// Token Management
// ------------------------------------------
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
  }
}

export async function saveUser(user: any): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export const getSavedUser = async (): Promise<any | null> => {
  try {
    const userStr = await SecureStore.getItemAsync(USER_KEY);
    if (userStr) return JSON.parse(userStr);

    const legacyUser = await AsyncStorage.getItem(USER_KEY);
    if (legacyUser) {
      const parsed = JSON.parse(legacyUser);
      await SecureStore.setItemAsync(USER_KEY, legacyUser);
      const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (legacyToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
      await AsyncStorage.removeItem(USER_KEY);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const updatePushToken = async (pushToken: string) => {
  return await apiFetch('/api/auth/push-token', {
    method: 'PUT',
    body: JSON.stringify({ pushToken }),
  });
};

export async function clearAuth(): Promise<void> {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(USER_KEY); } catch {}
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
  await clearApiCache();
}

// ------------------------------------------
// Core Fetch Wrapper
// ------------------------------------------
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  count?: number;
  [key: string]: any;
}

interface ApiCacheMeta {
  source: 'local' | 'network';
  stale: boolean;
  cachedAt?: string;
}

export type CachedApiResponse<T = any> = ApiResponse<T> & {
  _cache?: ApiCacheMeta;
};

export interface GetRequestOptions {
  forceRefresh?: boolean;
  ttlMs?: number;
  staleWhileRevalidate?: boolean;
}

interface CachedEntry<T = any> {
  timestamp: number;
  response: ApiResponse<T>;
}

const API_CACHE_PREFIX = 'api_cache_v1';
const DEFAULT_TALLY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TALLY_STATIC_TTL_MS = 30 * 60 * 1000;
const DEFAULT_USER_DATA_TTL_MS = 15 * 60 * 1000;
const DEFAULT_NOTIFICATIONS_TTL_MS = 30 * 1000;

const inMemoryCache = new Map<string, CachedEntry<any>>();
const pendingNetworkRequests = new Map<string, Promise<ApiResponse<any>>>();

const clearApiCache = async () => {
  try {
    inMemoryCache.clear();
    pendingNetworkRequests.clear();
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(`${API_CACHE_PREFIX}:`));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Ignore cache clear errors
  }
};

const invalidateApiCacheEntries = async (endpointMatchers: string[]) => {
  if (endpointMatchers.length === 0) return;

  const shouldInvalidate = (key: string) => endpointMatchers.some((matcher) => key.includes(matcher));

  for (const key of Array.from(inMemoryCache.keys())) {
    if (shouldInvalidate(key)) {
      inMemoryCache.delete(key);
      pendingNetworkRequests.delete(key);
    }
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter((k) => k.startsWith(`${API_CACHE_PREFIX}:`) && shouldInvalidate(k));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch {
    // Ignore cache invalidation errors
  }
};

const buildCacheKey = (scope: string, endpoint: string) => `${API_CACHE_PREFIX}:${scope}:${endpoint}`;
const buildRefreshEndpoint = (endpoint: string) =>
  endpoint.includes('?') ? `${endpoint}&refresh=true` : `${endpoint}?refresh=true`;

const readCachedResponse = async <T = any>(cacheKey: string): Promise<CachedEntry<T> | null> => {
  const memoryHit = inMemoryCache.get(cacheKey);
  if (memoryHit) {
    return memoryHit as CachedEntry<T>;
  }

  try {
    const value = await AsyncStorage.getItem(cacheKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as CachedEntry<T>;
    if (!parsed || !parsed.timestamp || !parsed.response) return null;
    inMemoryCache.set(cacheKey, parsed as CachedEntry<any>);
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedResponse = async <T = any>(cacheKey: string, response: ApiResponse<T>) => {
  const payload: CachedEntry<T> = {
    timestamp: Date.now(),
    response,
  };
  inMemoryCache.set(cacheKey, payload as CachedEntry<any>);

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore caching errors to avoid breaking UX
  }
};

const withCacheMeta = <T = any>(
  response: ApiResponse<T>,
  meta: ApiCacheMeta
): CachedApiResponse<T> => ({
  ...response,
  _cache: meta,
});

const fetchAndCache = async <T = any>(
  cacheKey: string,
  endpoint: string,
  forceRefresh: boolean
): Promise<ApiResponse<T>> => {
  const pending = pendingNetworkRequests.get(cacheKey);
  if (pending) {
    return pending as Promise<ApiResponse<T>>;
  }

  const networkEndpoint = forceRefresh ? buildRefreshEndpoint(endpoint) : endpoint;
  const request = apiFetch<T>(networkEndpoint)
    .then(async (fresh) => {
      await writeCachedResponse(cacheKey, fresh);
      return fresh;
    })
    .finally(() => {
      pendingNetworkRequests.delete(cacheKey);
    });

  pendingNetworkRequests.set(cacheKey, request as Promise<ApiResponse<any>>);
  return request;
};

const revalidateCacheInBackground = async <T = any>(cacheKey: string, endpoint: string) => {
  try {
    await fetchAndCache<T>(cacheKey, endpoint, false);
  } catch {
    // Ignore background refresh errors
  }
};

export const apiGetWithCache = async <T = any>(
  endpoint: string,
  options: GetRequestOptions = {}
): Promise<CachedApiResponse<T>> => {
  const {
    forceRefresh = false,
    ttlMs = DEFAULT_TALLY_TTL_MS,
    staleWhileRevalidate = true,
  } = options;

  const token = await getToken();
  const cacheScope = token ? token.slice(-16) : 'public';
  const cacheKey = buildCacheKey(cacheScope, endpoint);
  const cached = await readCachedResponse<T>(cacheKey);

  if (cached && !forceRefresh) {
    const ageMs = Date.now() - cached.timestamp;
    const isFresh = ageMs <= ttlMs;

    if (isFresh) {
      return withCacheMeta(cached.response, {
        source: 'local',
        stale: false,
        cachedAt: new Date(cached.timestamp).toISOString(),
      });
    }

    if (staleWhileRevalidate) {
      void revalidateCacheInBackground<T>(cacheKey, endpoint);
      return withCacheMeta(cached.response, {
        source: 'local',
        stale: true,
        cachedAt: new Date(cached.timestamp).toISOString(),
      });
    }
  }

  try {
    const fresh = await fetchAndCache<T>(cacheKey, endpoint, forceRefresh);
    return withCacheMeta(fresh, {
      source: 'network',
      stale: false,
    });
  } catch (error) {
    if (cached) {
      return withCacheMeta(cached.response, {
        source: 'local',
        stale: true,
        cachedAt: new Date(cached.timestamp).toISOString(),
      });
    }
    throw error;
  }
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const text = await response.text();
    let json: ApiResponse<T>;
    try {
      json = text ? (JSON.parse(text) as ApiResponse<T>) : ({} as ApiResponse<T>);
    } catch {
      throw new ApiError(
        `Server returned non-JSON (${response.status}). Check API URL and backend.`,
        response.status,
        { raw: text.slice(0, 300) }
      );
    }

    if (!response.ok) {
      throw new ApiError(
        json.message || `Request failed with status ${response.status}`,
        response.status,
        json
      );
    }

    return json;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const cause = error instanceof Error ? error.message : String(error);
    if (__DEV__) {
      console.warn('[apiFetch]', endpoint, cause);
    }
    throw new ApiError(
      __DEV__
        ? `Network error: ${cause}`
        : 'Network error. Please check your connection and try again.',
      0,
      null
    );
  }
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ------------------------------------------
// Auth API
// ------------------------------------------
export async function loginApi(email: string, password: string) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.success && response.token) {
    await saveToken(response.token);
    await saveUser(response.data);
  }

  return response;
}

export async function updatePassword(oldPassword: string, newPassword: string) {
  return apiFetch('/api/auth/update-password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

/** Account deletion ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â implement this route on your backend (Apple App Store requirement). */
export async function deleteAccountApi() {
  return apiFetch('/api/auth/delete-account', {
    method: 'POST',
  });
}

export async function getMeApi() {
  return apiFetch('/api/auth/me');
}

// ------------------------------------------
// Tally Data API
// ------------------------------------------
export async function getProfitLoss(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/profit-loss${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getBankPosition(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/bank-position${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getReceivables(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/receivables${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getPayables(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/payables${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getInvoiceRegister(
  fromDate?: string,
  toDate?: string,
  clientName?: string,
  paymentStatus?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  if (clientName) params.append('clientName', clientName);
  if (paymentStatus) params.append('paymentStatus', paymentStatus);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/invoice-register${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getClientBilling(
  clientName?: string,
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (clientName) params.append('clientName', clientName);
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/client-billing${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getCompanies(options: GetRequestOptions = {}) {
  return apiGetWithCache('/api/tally/companies', {
    ttlMs: DEFAULT_TALLY_STATIC_TTL_MS,
    ...options,
  });
}

export async function getGSTSummary(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/gst-summary${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getBalanceSheet(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/balance-sheet${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function getTrialBalance(
  fromDate?: string,
  toDate?: string,
  options: GetRequestOptions = {}
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiGetWithCache(`/api/tally/trial-balance${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_TALLY_TTL_MS,
    ...options,
  });
}

export async function testTallyConnection(options: GetRequestOptions = {}) {
  return apiGetWithCache('/api/tally/test-public', {
    ttlMs: 30 * 1000,
    ...options,
  });
}
// ==========================================
// PHASE 2 ENDPOINTS (Tasks, Employees, Notifications)
// ==========================================

export const getEmployees = async (options: GetRequestOptions = {}) => {
  return await apiGetWithCache('/api/auth/users', {
    ttlMs: DEFAULT_USER_DATA_TTL_MS,
    ...options,
  });
};

export const getTasks = async (
  params: { status?: string, assignedTo?: string } = {},
  options: GetRequestOptions = {}
) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.assignedTo) query.append('assignedTo', params.assignedTo);
  const qs = query.toString();
  return await apiGetWithCache(`/api/tasks${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_USER_DATA_TTL_MS,
    ...options,
  });
};

export const getTask = async (id: string) => {
  return await apiFetch(`/api/tasks/${id}`);
};

export const createTask = async (taskData: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  assignedTo: string;
  clientName?: string;
  dueDate?: string;
  status?: string;
}) => {
  const response = await apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
  if (response.success) {
    await invalidateApiCacheEntries(['/api/tasks', '/api/notifications', '/api/tasks/user/counts']);
  }
  return response;
};

export const createClient = async (clientData: {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  contactPerson?: string;
  licenseNum?: string;
  licenseExpire?: string;
  groupEmployeeIds?: string[];
}) => {
  const response = await apiFetch('/api/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
  if (response.success) {
    await invalidateApiCacheEntries(['/api/clients', '/api/tally/client-billing']);
  }
  return response;
};

export const getClients = async (options: GetRequestOptions = {}) => {
  return await apiGetWithCache('/api/clients', {
    ttlMs: DEFAULT_USER_DATA_TTL_MS,
    ...options,
  });
};

export const getClient = async (id: string, options: GetRequestOptions = {}) => {
  return await apiGetWithCache(`/api/clients/${id}`, {
    ttlMs: DEFAULT_USER_DATA_TTL_MS,
    ...options,
  });
};

export const updateClient = async (id: string, data: Record<string, any>) => {
  const response = await apiFetch(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/clients/${id}`, '/api/clients', '/api/tally/client-billing']);
  }
  return response;
};

export const deleteClient = async (id: string) => {
  const response = await apiFetch(`/api/clients/${id}`, {
    method: 'DELETE',
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/clients/${id}`, '/api/clients', '/api/tally/client-billing']);
  }
  return response;
};

export const updateTaskStatus = async (id: string, status: string, updateTitle?: string, updateDescription?: string) => {
  const response = await apiFetch(`/api/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, updateTitle, updateDescription }),
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/tasks/${id}`, '/api/tasks', '/api/notifications', '/api/tasks/user/counts']);
  }
  return response;
};

export const updateTask = async (id: string, data: Record<string, any>) => {
  const response = await apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/tasks/${id}`, '/api/tasks', '/api/notifications', '/api/tasks/user/counts']);
  }
  return response;
};

export const deleteTask = async (id: string) => {
  const response = await apiFetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/tasks/${id}`, '/api/tasks', '/api/notifications', '/api/tasks/user/counts']);
  }
  return response;
};

export const getTaskCounts = async () => {
  return await apiFetch('/api/tasks/user/counts');
};

export const getTaskDetail = async (taskId: string) => {
  return await apiFetch(`/api/tasks/${taskId}`);
};

export const getTaskUpdates = async (taskId: string) => {
  return await apiFetch(`/api/tasks/${taskId}/updates`);
};

export const createTaskUpdate = async (taskId: string, data: {
  title?: string;
  description?: string;
  status: string;
}) => {
  const response = await apiFetch(`/api/tasks/${taskId}/updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.success) {
    await invalidateApiCacheEntries([`/api/tasks/${taskId}`, '/api/tasks', '/api/notifications', '/api/tasks/user/counts']);
  }
  return response;
};

export const getNotifications = async (
  mode?: 'task' | 'general',
  dateFilter?: string,
  options: GetRequestOptions = {}
) => {
  const params = new URLSearchParams();
  if (mode) params.append('mode', mode);
  if (dateFilter) params.append('dateFilter', dateFilter);
  const qs = params.toString();
  return await apiGetWithCache(`/api/notifications${qs ? `?${qs}` : ''}`, {
    ttlMs: DEFAULT_NOTIFICATIONS_TTL_MS,
    ...options,
  });
};

export const markNotificationRead = async (id: string) => {
  const response = await apiFetch(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
  if (response.success) {
    await invalidateApiCacheEntries(['/api/notifications']);
  }
  return response;
};

export const markAllNotificationsRead = async () => {
  const response = await apiFetch('/api/notifications/read-all', {
    method: 'PUT',
  });
  if (response.success) {
    await invalidateApiCacheEntries(['/api/notifications']);
  }
  return response;
};

const TALLY_PREFETCH_ENDPOINTS = [
  '/api/tally/test-public',
  '/api/tally/diagnostics',
  '/api/tally/companies',
  '/api/tally/trial-balance',
  '/api/tally/ledgers',
  '/api/tally/ledger-groups',
  '/api/tally/day-book',
  '/api/tally/stock-items',
  '/api/tally/stock-groups',
  '/api/tally/vouchers/Sales',
  '/api/tally/receivables',
  '/api/tally/payables',
  '/api/tally/profit-loss',
  '/api/tally/gst-summary',
  '/api/tally/client-billing',
  '/api/tally/bank-position',
  '/api/tally/invoice-register',
  '/api/tally/balance-sheet',
  '/api/tally/reports/summary',
] as const;

export const prefetchTallyEndpoints = async (forceRefresh = false) => {
  await Promise.allSettled(
    TALLY_PREFETCH_ENDPOINTS.map((endpoint) =>
      apiGetWithCache(endpoint, {
        forceRefresh,
        ttlMs: DEFAULT_TALLY_TTL_MS,
        staleWhileRevalidate: true,
      })
    )
  );
};

export const prefetchEssentialAppData = async (
  userRole?: string,
  options: GetRequestOptions = {}
) => {
  const role = (userRole || '').toLowerCase();
  const requestOptions: GetRequestOptions = {
    forceRefresh: false,
    staleWhileRevalidate: true,
    ...options,
  };

  const jobs: Promise<any>[] = [
    getEmployees(requestOptions),
    getClients(requestOptions),
    getTasks({}, requestOptions),
    getNotifications(undefined, 'today', requestOptions),
  ];

  if (role === 'admin' || role === 'manager') {
    jobs.push(
      getCompanies(requestOptions),
      getReceivables(undefined, undefined, requestOptions),
      getProfitLoss(undefined, undefined, requestOptions),
      getBankPosition(undefined, undefined, requestOptions),
      getClientBilling(undefined, undefined, undefined, requestOptions),
      prefetchTallyEndpoints(false)
    );
  }

  await Promise.allSettled(jobs);
};
export { API_BASE_URL };


















