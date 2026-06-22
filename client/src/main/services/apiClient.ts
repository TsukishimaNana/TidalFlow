import { DEFAULT_SERVER_URL } from '@tidalflow/shared';
import type { ApiResponse } from '@tidalflow/shared';

const API_PREFIX = '/api/v1';

type QueryParams = Record<string, string | number | boolean | null | undefined>;
type RequestBody = unknown;

function getServerUrl(): string {
  return process.env.TIDALFLOW_SERVER_URL ?? process.env.SERVER_URL ?? DEFAULT_SERVER_URL;
}

export function getApiKey(): string {
  return process.env.API_KEY ?? process.env.TIDALFLOW_API_KEY ?? '';
}

export function getWsUrl(): string {
  if (process.env.TIDALFLOW_WS_URL) {
    return process.env.TIDALFLOW_WS_URL;
  }

  const serverUrl = new URL(getServerUrl());
  serverUrl.protocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  serverUrl.pathname = '/ws';
  serverUrl.search = '';
  serverUrl.hash = '';

  return serverUrl.toString();
}

function normalizePath(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (cleanPath === '/health' || cleanPath.startsWith(API_PREFIX)) {
    return cleanPath;
  }

  return `${API_PREFIX}${cleanPath}`;
}

function createUrl(path: string, params?: QueryParams): string {
  const url = new URL(normalizePath(path), getServerUrl());

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const error =
      typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;

    return { success: false, error };
  }

  if (typeof payload === 'object' && payload !== null && 'success' in payload) {
    return payload as ApiResponse<T>;
  }

  return { success: true, data: payload as T };
}

async function request<T>(method: string, path: string, body?: RequestBody, params?: QueryParams): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'X-API-Key': getApiKey()
  };

  let requestBody: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(createUrl(path, params), {
      method,
      headers,
      body: requestBody
    });

    return await parseResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network request failed'
    };
  }
}

export const apiClient = {
  get<T>(path: string, params?: QueryParams): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, params);
  },

  post<T>(path: string, body?: RequestBody): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body);
  },

  put<T>(path: string, body?: RequestBody): Promise<ApiResponse<T>> {
    return request<T>('PUT', path, body);
  },

  patch<T>(path: string, body?: RequestBody): Promise<ApiResponse<T>> {
    return request<T>('PATCH', path, body);
  },

  delete<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path);
  }
};
