import { supabase } from './supabase';
import { AdminUser, UserListResponse, UserStats, ProxyItem, UserAgent, AppGroup, Tag, AppProfile, LaunchData, OtpAccount } from '../types';
import { store } from '../store/store';
import { logout } from '../store/authSlice';

const FUNCTION_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/user-management';
const PROXY_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/admin-proxies';
const APP_MANAGER_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/app-manager';
const OTP_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/otp-manager';
const TWO_FACTOR_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/two-factor-manager';
const GET_ROLE_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/get-role';

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada');

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};

export const getUserRole = async (userId: string): Promise<string> => {
  try {
    const headers = await getHeaders();

    // Call the dedicated Edge Function to get the role
    const res = await fetch(GET_ROLE_URL, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      console.warn('Failed to fetch role from endpoint');
      // Fallback: Check auth metadata if API fails
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.user_metadata?.role || 'user';
    }

    const data = await res.json();
    // Expecting format: { "role": "admin" } or { "role": "user" }
    return data.role || 'user';
  } catch (e) {
    console.warn('Erro ao verificar role, assumindo user padrão:', e);
    return 'user';
  }
};

// Helper para tratar erros de fetch
const safeFetch = async (url: string, options: RequestInit) => {
  try {
    const res = await fetch(url, options);

    // INTERCEPTOR GLOBAL DE 401 (SINGLE SESSION)
    // Se a API retornar 401, significa que o token é inválido ou a sessão foi derrubada remotamente.
    if (res.status === 401) {
      console.warn("Sessão invalidada (401). Realizando logout forçado.");
      await supabase.auth.signOut();
      store.dispatch(logout()); // Dispara logout no Redux diretamente
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Erro API: ${res.status}`);
    }
    return res;
  } catch (error: any) {
    // Diferencia erro de rede (Failed to fetch) de erro da API
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Erro de conexão. Verifique sua internet ou se a API está online.');
    }
    throw error;
  }
};

export const userApi = {
  list: async (page = 1, perPage = 10, search = ''): Promise<UserListResponse> => {
    const headers = await getHeaders();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });

    if (search) {
      queryParams.append('search', search);
    }

    const res = await safeFetch(`${FUNCTION_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers
    });
    return res.json();
  },

  getStats: async (): Promise<UserStats> => {
    const headers = await getHeaders();
    const res = await safeFetch(`${FUNCTION_URL}?stats=true`, {
      method: 'GET',
      headers
    });
    return res.json();
  },

  exportCSV: async () => {
    const headers = await getHeaders();
    const res = await safeFetch(`${FUNCTION_URL}?export=true`, {
      method: 'GET',
      headers
    });
    return res.blob();
  },

  create: async (data: { email: string; password: string; expires_at?: string }) => {
    const headers = await getHeaders();
    const derivedNickname = data.email.split('@')[0];

    const res = await safeFetch(FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data,
        nickname: derivedNickname
      })
    });
    return res.json();
  },

  update: async (id: string, data: { password?: string; email?: string; expires_at?: string }) => {
    const headers = await getHeaders();

    const payload: any = { id };
    if (data.email) {
      payload.email = data.email;
      payload.nickname = data.email.split('@')[0];
    }
    if (data.password) payload.password = data.password;
    if (data.expires_at !== undefined) payload.expires_at = data.expires_at;

    const res = await safeFetch(FUNCTION_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  ban: async (ids: string[], duration: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(FUNCTION_URL, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ids, ban_duration: duration })
    });
    return res.json();
  },

  delete: async (ids: string[]) => {
    const headers = await getHeaders();
    const res = await safeFetch(FUNCTION_URL, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids })
    });
    return res.json();
  }
};

export const proxyApi = {
  list: async (): Promise<ProxyItem[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(PROXY_URL, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  getUserAgents: async (): Promise<UserAgent[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(`${PROXY_URL}?target=uas`, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  create: async (data: Partial<ProxyItem>) => {
    const headers = await getHeaders();
    const res = await safeFetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  update: async (data: Partial<ProxyItem> & { id: string }) => {
    const headers = await getHeaders();
    const res = await safeFetch(PROXY_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  delete: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(PROXY_URL, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id: [id] })
    });
    return res.json();
  }
};

export const appManagerApi = {
  getTags: async (): Promise<Tag[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=tags`, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  getGroups: async (): Promise<AppGroup[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=groups`, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  createGroup: async (data: { name: string, tags?: string[] }) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateGroup: async (data: { id: string, name: string, tags?: string[] }) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=groups`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteGroup: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=groups`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id })
    });
    return res.json();
  },

  getApps: async (): Promise<AppProfile[]> => {
    const headers = await getHeaders();
    try {
      const res = await safeFetch(`${APP_MANAGER_URL}?target=apps`, { method: 'GET', headers });
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    } catch {
      return [];
    }
  },

  createApp: async (data: {
    group_id: string,
    name: string,
    start_url: string,
    proxy_id?: string | null,
    is_autofill_enabled?: boolean,
    login?: string,
    password?: string,
    login_selector?: string,
    password_selector?: string,
    sync_credentials?: boolean,
    ublock_rules?: string,
    url_blocks?: string
  }) => {
    const headers = await getHeaders();

    const payload = {
      group_id: data.group_id,
      name: data.name,
      start_url: data.start_url,
      proxy_id: data.proxy_id || null,
      is_autofill_enabled: data.is_autofill_enabled,
      login: data.login,
      password: data.password,
      login_selector: data.login_selector,
      password_selector: data.password_selector,
      sync_credentials: data.sync_credentials,
      ublock_rules: data.ublock_rules,
      url_blocks: data.url_blocks
    };

    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  updateApp: async (data: {
    id: string,
    name?: string,
    start_url?: string,
    proxy_id?: string | null,
    is_autofill_enabled?: boolean,
    login?: string,
    password?: string,
    login_selector?: string,
    password_selector?: string,
    sync_credentials?: boolean,
    ublock_rules?: string,
    url_blocks?: string
  }) => {
    const headers = await getHeaders();

    const payload = {
      id: data.id,
      name: data.name,
      start_url: data.start_url,
      proxy_id: data.proxy_id === '' ? null : data.proxy_id,
      is_autofill_enabled: data.is_autofill_enabled,
      login: data.login,
      password: data.password,
      login_selector: data.login_selector,
      password_selector: data.password_selector,
      sync_credentials: data.sync_credentials,
      ublock_rules: data.ublock_rules,
      url_blocks: data.url_blocks
    };

    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  deleteApp: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps&id=${id}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  launchApp: async (id: string): Promise<LaunchData> => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps&action=launch&id=${id}`, {
      method: 'GET',
      headers
    });
    return res.json();
  },

  saveSession: async (id: string, sessionData: any) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps&action=save_session&id=${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        session_data: sessionData,
        hash: Date.now().toString()
      })
    });
    return res.json();
  },

  duplicateApp: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(`${APP_MANAGER_URL}?target=apps&action=duplicate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id })
    });
    return res.json();
  }
};

export const otpApi = {
  list: async (): Promise<OtpAccount[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(OTP_URL, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  create: async (data: { provider_name: string, otp_secret: string }) => {
    const headers = await getHeaders();
    const res = await safeFetch(OTP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  delete: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(OTP_URL, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id })
    });
    return res.json();
  }
};

export const twoFactorApi = {
  list: async (): Promise<OtpAccount[]> => {
    const headers = await getHeaders();
    const res = await safeFetch(TWO_FACTOR_URL, { method: 'GET', headers });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  create: async (data: { provider_name: string, otp_secret: string }) => {
    const headers = await getHeaders();
    const res = await safeFetch(TWO_FACTOR_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  delete: async (id: string) => {
    const headers = await getHeaders();
    const res = await safeFetch(TWO_FACTOR_URL, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id })
    });
    return res.json();
  }
};