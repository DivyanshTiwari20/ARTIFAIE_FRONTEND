// services/api.ts
// Central API client for communicating with the tally-backend

import AsyncStorage from '@react-native-async-storage/async-storage';

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
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUser(user: any): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
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

async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
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

/** Account deletion — implement this route on your backend (Apple App Store requirement). */
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
export async function getProfitLoss(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/profit-loss${qs ? `?${qs}` : ''}`);
}

export async function getBankPosition(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/bank-position${qs ? `?${qs}` : ''}`);
}

export async function getReceivables(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/receivables${qs ? `?${qs}` : ''}`);
}

export async function getPayables(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/payables${qs ? `?${qs}` : ''}`);
}

export async function getInvoiceRegister(
  fromDate?: string,
  toDate?: string,
  clientName?: string,
  paymentStatus?: string
) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  if (clientName) params.append('clientName', clientName);
  if (paymentStatus) params.append('paymentStatus', paymentStatus);
  const qs = params.toString();
  return apiFetch(`/api/tally/invoice-register${qs ? `?${qs}` : ''}`);
}

export async function getClientBilling(
  clientName?: string,
  fromDate?: string,
  toDate?: string
) {
  const params = new URLSearchParams();
  if (clientName) params.append('clientName', clientName);
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/client-billing${qs ? `?${qs}` : ''}`);
}

export async function getCompanies() {
  return apiFetch('/api/tally/companies');
}

export async function getGSTSummary(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/gst-summary${qs ? `?${qs}` : ''}`);
}

export async function getBalanceSheet(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/balance-sheet${qs ? `?${qs}` : ''}`);
}

export async function getTrialBalance(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  const qs = params.toString();
  return apiFetch(`/api/tally/trial-balance${qs ? `?${qs}` : ''}`);
}

export async function testTallyConnection() {
  return apiFetch('/api/tally/test-public');
}

// ==========================================
// PHASE 2 ENDPOINTS (Tasks, Employees, Notifications)
// ==========================================

export const getEmployees = async () => {
  return await apiFetch('/api/auth/users');
};

export const getTasks = async (params: { status?: string, assignedTo?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.assignedTo) query.append('assignedTo', params.assignedTo);
  const qs = query.toString();
  return await apiFetch(`/api/tasks${qs ? `?${qs}` : ''}`);
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
  return await apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
};

export const createClient = async (clientData: {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  contactPerson?: string;
  licenseNum?: string;
  licenseExpire?: string;
}) => {
  return await apiFetch('/api/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
};

export const updateTaskStatus = async (id: string, status: string) => {
  return await apiFetch(`/api/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const getTaskCounts = async () => {
  return await apiFetch('/api/tasks/user/counts');
};

export const getNotifications = async (mode?: 'task' | 'general') => {
  const params = new URLSearchParams();
  if (mode) params.append('mode', mode);
  const qs = params.toString();
  return await apiFetch(`/api/notifications${qs ? `?${qs}` : ''}`);
};

export const markNotificationRead = async (id: string) => {
  return await apiFetch(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
};

export const markAllNotificationsRead = async () => {
  return await apiFetch('/api/notifications/read-all', {
    method: 'PUT',
  });
};

export { API_BASE_URL };
