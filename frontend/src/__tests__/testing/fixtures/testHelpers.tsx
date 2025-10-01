/**
 * Test Helpers and Utilities
 * Provides common testing functionality with real data patterns
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        cacheTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Create mock file for testing file uploads
 */
export function createMockFile(
  name: string,
  size: number,
  type: string,
  content?: ArrayBuffer | string
): File {
  const blob = new Blob([content || new ArrayBuffer(size)], { type });
  const file = new File([blob], name, { type });

  // Add lastModified property
  Object.defineProperty(file, 'lastModified', {
    value: Date.now(),
    writable: false,
  });

  return file;
}

/**
 * Create mock Excel file with real structure
 */
export function createMockExcelFile(data: any[], filename: string = 'test.xlsx'): File {
  // Simulate Excel file structure
  const excelContent = JSON.stringify(data);
  return createMockFile(
    filename,
    excelContent.length,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    excelContent
  );
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, delay: number = 100): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Mock API error helper
 */
export function mockApiError(message: string, status: number = 500, delay: number = 100): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message) as any;
      error.response = {
        status,
        data: { message, code: `ERROR_${status}` },
      };
      reject(error);
    }, delay);
  });
}

/**
 * Create mock FormData for file uploads
 */
export function createMockFormData(file: File, additionalData?: Record<string, any>): FormData {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
  }

  return formData;
}

/**
 * Mock localStorage for testing
 */
export class MockLocalStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

/**
 * Setup mock localStorage
 */
export function setupMockLocalStorage(): MockLocalStorage {
  const mockLocalStorage = new MockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  return mockLocalStorage;
}

/**
 * Mock fetch for testing
 */
export function setupMockFetch() {
  const mockFetch = jest.fn();
  global.fetch = mockFetch as any;
  return mockFetch;
}

/**
 * Create mock response for fetch
 */
export function createMockResponse<T>(data: T, status: number = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json',
    }),
    clone: () => createMockResponse(data, status),
  } as Response;
}

/**
 * Assert element has expected ARIA attributes
 */
export function assertAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string | boolean | number>
): void {
  Object.entries(attributes).forEach(([attr, value]) => {
    const ariaAttr = attr.startsWith('aria-') ? attr : `aria-${attr}`;
    expect(element).toHaveAttribute(ariaAttr, String(value));
  });
}

/**
 * Assert element is accessible
 */
export async function assertAccessible(element: HTMLElement): Promise<void> {
  const { axe, toHaveNoViolations } = require('jest-axe');
  expect.extend({ toHaveNoViolations });

  const results = await axe(element);
  expect(results).toHaveNoViolations();
}

/**
 * Generate test IDs for consistent testing
 */
export function generateTestId(component: string, element: string): string {
  return `${component}-${element}`.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Mock console methods for cleaner test output
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });

  return {
    log: console.log as jest.Mock,
    error: console.error as jest.Mock,
    warn: console.warn as jest.Mock,
    info: console.info as jest.Mock,
  };
}

/**
 * Create mock intersection observer
 */
export function setupMockIntersectionObserver() {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver as any;
  return mockIntersectionObserver;
}

/**
 * Create mock resize observer
 */
export function setupMockResizeObserver() {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });
  window.ResizeObserver = mockResizeObserver as any;
  return mockResizeObserver;
}

/**
 * Simulate network conditions
 */
export function simulateNetworkCondition(condition: 'online' | 'offline' | 'slow') {
  switch (condition) {
    case 'offline':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
      break;
    case 'online':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
      break;
    case 'slow':
      // Simulate slow network by adding delays to fetch
      jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
        await waitForAsync(3000);
        return fetch(input as any, init);
      });
      break;
  }
}

/**
 * Clean up all mocks and timers
 */
export function cleanupTests() {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();

  // Clean up DOM
  document.body.innerHTML = '';

  // Reset window properties
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
}

// Export all helpers as a namespace for convenience
export const TestHelpers = {
  renderWithProviders,
  createTestQueryClient,
  createMockFile,
  createMockExcelFile,
  waitForAsync,
  mockApiResponse,
  mockApiError,
  createMockFormData,
  MockLocalStorage,
  setupMockLocalStorage,
  setupMockFetch,
  createMockResponse,
  assertAriaAttributes,
  assertAccessible,
  generateTestId,
  mockConsole,
  setupMockIntersectionObserver,
  setupMockResizeObserver,
  simulateNetworkCondition,
  cleanupTests,
};