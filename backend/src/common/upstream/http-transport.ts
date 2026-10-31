// Thin HTTP transport abstraction. Production uses axios (already a backend
// dependency); tests inject a fake so no test needs network access.

import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface HttpTransportRequest {
  url: string;
  timeoutMs: number;
  headers: Record<string, string>;
}

export interface HttpTransportResponse {
  status: number;
  /** Lower-cased header names. */
  headers: Record<string, string | undefined>;
  body: unknown;
}

export interface HttpTransport {
  get(request: HttpTransportRequest): Promise<HttpTransportResponse>;
}

export const HTTP_TRANSPORT = Symbol('OPENGP_HTTP_TRANSPORT');

export class TransportTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportTimeoutError';
  }
}

export class TransportNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportNetworkError';
  }
}

function normalizeHeaderValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

@Injectable()
export class AxiosHttpTransport implements HttpTransport {
  private readonly http: AxiosInstance = axios.create({
    // Status handling is done by JsonHttpClient, never by exceptions.
    validateStatus: () => true,
    responseType: 'json',
  });

  async get(request: HttpTransportRequest): Promise<HttpTransportResponse> {
    try {
      const response = await this.http.get<unknown>(request.url, {
        timeout: request.timeoutMs,
        headers: request.headers,
      });

      const headers: Record<string, string | undefined> = {};
      const rawHeaders: Record<string, unknown> = { ...response.headers };
      for (const [name, value] of Object.entries(rawHeaders)) {
        headers[name.toLowerCase()] = normalizeHeaderValue(value);
      }

      return { status: response.status, headers, body: response.data };
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      ) {
        throw new TransportTimeoutError(`Request timed out: ${request.url}`);
      }
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new TransportNetworkError(`Request failed: ${reason}`);
    }
  }
}
