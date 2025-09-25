import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { FunifierCredentials, FunifierApiError } from '@/types/funifier';

export enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FUNIFIER_API_ERROR = 'FUNIFIER_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
}

export class FunifierApiClient {
  private axiosInstance: AxiosInstance;
  private credentials: FunifierCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || 'https://service2.funifier.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.accessToken && this.isTokenValid()) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        } else if (this.credentials?.authToken) {
          config.headers.Authorization = `Basic ${this.credentials.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(this.handleError(error))
    );
  }

  setCredentials(credentials: FunifierCredentials): void {
    this.credentials = credentials;
    if (credentials.serverUrl) {
      this.axiosInstance.defaults.baseURL = credentials.serverUrl;
    }
  }

  setAccessToken(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  }

  private isTokenValid(): boolean {
    return this.tokenExpiresAt ? new Date() < this.tokenExpiresAt : false;
  }

  private handleError(error: unknown): ApiError {
    const timestamp = new Date();

    // Network errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: `Network error: ${error.message}`,
          details: error,
          timestamp,
          retryable: true,
          userMessage: 'Connection failed. Please check your internet connection and try again.',
        };
      }

      // HTTP errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as FunifierApiError;

        if (status === 401 || status === 403) {
          return {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: data?.message || 'Authentication failed',
            details: data,
            timestamp,
            retryable: false,
            userMessage: 'Authentication failed. Please check your credentials.',
          };
        }

        if (status >= 500) {
          return {
            type: ErrorType.FUNIFIER_API_ERROR,
            message: data?.message || 'Server error',
            details: data,
            timestamp,
            retryable: true,
            userMessage: 'Server error. Please try again in a few moments.',
          };
        }

        return {
          type: ErrorType.FUNIFIER_API_ERROR,
          message: data?.message || `HTTP ${status} error`,
          details: data,
          timestamp,
          retryable: false,
          userMessage: data?.message || 'An error occurred. Please try again.',
        };
      }
    }

    // Generic errors
    return {
      type: ErrorType.FUNIFIER_API_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      timestamp,
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again.',
    };
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.retryRequest<T>(config);
  }

  private async retryRequest<T>(
    config: AxiosRequestConfig,
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request(config);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      
      if (apiError.retryable && attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest<T>(config, attempt + 1, maxAttempts);
      }
      
      throw apiError;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Health check endpoint to verify Funifier API connectivity
   */
  async healthCheck(): Promise<{ status: 'ok'; timestamp: string }> {
    try {
      // Use a lightweight endpoint to check connectivity
      // If no specific health endpoint exists, we can use a simple API call
      const response = await this.get<any>('/v3/health', { timeout: 5000 });
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // If health endpoint doesn't exist, try a basic endpoint
      try {
        await this.get<any>('/v3/version', { timeout: 5000 });
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw this.handleError(error);
      }
    }
  }
}

// Singleton instance
export const funifierApiClient = new FunifierApiClient();