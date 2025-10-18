import { render, screen } from '@testing-library/react';
import ErrorBoundary from './error-boundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    console.error = originalError;
  });

  it('calls onError when an error occurs', () => {
    const onError = jest.fn();
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    console.error = originalError;
  });

  it('renders global error UI for global level', () => {
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary level="global">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('The application encountered an unexpected error.')).toBeInTheDocument();
    expect(screen.getByText('Reload Application')).toBeInTheDocument();

    console.error = originalError;
  });

  it('renders section error UI for non-global level', () => {
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary level="route">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('This section of the app encountered an error.')).toBeInTheDocument();
    expect(screen.queryByText('Reload Application')).not.toBeInTheDocument();

    console.error = originalError;
  });

  it('renders custom fallback when provided', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();

    console.error = originalError;
  });

  it('shows error details in development mode', () => {
    const originalError = console.error;
    const originalEnv = process.env.NODE_ENV;

    console.error = jest.fn();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details')).toBeInTheDocument();

    console.error = originalError;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    });
  });

  it('hides error details in production mode', () => {
    const originalError = console.error;
    const originalEnv = process.env.NODE_ENV;

    console.error = jest.fn();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();

    console.error = originalError;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    });
  });
});