export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: any }>;
  run<T = unknown>(): Promise<{ results?: T[]; success: boolean; meta: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  httpMetadata?: {
    contentType?: string;
  };
  customMetadata?: Record<string, string>;
  body: ReadableStream;
}

export interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string, options?: any): Promise<R2Object | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: any): Promise<any>;
}

