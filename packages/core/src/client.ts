import type { FSConfig } from './types.js';

export class FSClient {
  private baseUrl: string;
  private token: string | null = null;
  private username: string;
  private password: string;
  private authenticating: Promise<void> | null = null;

  constructor(config: FSConfig) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  async authenticate(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!res.ok) {
      throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success || !data.access_token) {
      throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    }

    this.token = data.access_token;
  }

  private async ensureAuth(): Promise<void> {
    if (this.token) return;
    if (!this.authenticating) {
      this.authenticating = this.authenticate().finally(() => {
        this.authenticating = null;
      });
    }
    await this.authenticating;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
    isRetry = false,
  ): Promise<T> {
    await this.ensureAuth();

    const url = this.buildUrl(path, params);
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !isRetry) {
      this.token = null;
      await this.authenticate();
      return this.request<T>(method, path, body, params, true);
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText} on ${method} ${path}`);
    }

    const data = await res.json();

    if (data.success === false) {
      throw new Error(`API error: ${data.message || JSON.stringify(data)}`);
    }

    return data as T;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, params);
  }
}
