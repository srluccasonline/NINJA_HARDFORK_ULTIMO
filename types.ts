import React from 'react';

// Global Window Declaration moved to global.d.ts

export interface User {
  id: string;
  email: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}

export interface Profile {
  id: number;
  name: string;
  browser: string;
  status: 'active' | 'inactive' | 'suspended';
  proxy: string;
  lastUsed: string;
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}

// User Management Types
export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  role: string;
  created_at: string;
  expires_at: string | null;
  banned_until: string | null;
}

export interface UserStats {
  total_users: number;
  banned_users: number;
  expired_users: number;
  online_users: number;
}

export interface ApiMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface UserListResponse {
  data: AdminUser[];
  meta: ApiMeta;
}

// Proxy Management Types
export interface UserAgent {
  id: string;
  os: string;
  browser: string;
  version: string;
  device_type: string;
}

export interface ProxyItem {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
  status: 'active' | 'offline' | 'error' | 'dead';
  user_agent_id: string;
  ua_info?: {
    os: string;
    browser: string;
    version: string;
  };
}

// App Manager Types (New)
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface AppProfile {
  id: string;
  name: string;
  group_id: string;
  start_url: string;
  proxy_id?: string;
  status?: string;
  created_at?: string;
  // Visual helper
  proxy_name?: string;

  // Autofill Data
  is_autofill_enabled?: boolean;
  login?: string;
  password?: string;
  login_selector?: string;
  password_selector?: string;
  sync_credentials?: boolean;

  // Block Data (Strings now, not arrays)
  ublock_rules?: string;
  url_blocks?: string;

  // Session Data (For Remote Logout)
  session_version_hash?: string;
  last_trained_at?: string;

  // Activation Status
  is_active?: boolean;
}

export interface AppGroup {
  id: string;
  name: string;
  is_default: boolean;
  tags?: Tag[];
  created_at?: string;
  apps?: AppProfile[]; // Support for nested apps in API response
}

export interface LaunchData {
  config: any;
  session_url: string;
}

export interface OtpAccount {
  id: string;
  provider_name: string;
  otp_secret: string;
  created_at?: string;
}