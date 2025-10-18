// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Polyfills for Node environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock canvas for charts
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Array(4),
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  readyState: number = 0;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onabort: ((event: any) => void) | null = null;

  readAsText(file: Blob) {
    setTimeout(() => {
      this.result = 'mock file content';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 10);
  }

  readAsArrayBuffer(file: Blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 10);
  }

  readAsBinaryString(file: Blob) {
    setTimeout(() => {
      this.result = 'mock binary string';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 10);
  }

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = 'data:application/octet-stream;base64,';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 10);
  }

  abort() {
    this.readyState = 0;
    if (this.onabort) {
      this.onabort({} as any);
    }
  }
} as any;

// Mock fetch globally
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// MSW setup temporarily disabled due to TextEncoder polyfill issues
// import { server } from './test-utils/server';

// Start MSW server before tests
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers between tests
// afterEach(() => server.resetHandlers());

// Clean up after tests
// afterAll(() => server.close());
