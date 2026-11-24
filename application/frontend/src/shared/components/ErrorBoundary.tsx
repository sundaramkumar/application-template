import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this value changes, the boundary resets (e.g. route path). */
  resetKey?: unknown;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Hook for an error-tracking service (e.g. Sentry) later.
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="h-full flex items-center justify-center p-8">
        <div
          className="flex flex-col items-center gap-5 rounded-2xl px-10 py-9 shadow-xl text-center max-w-md"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #dc2626 12%, var(--color-surface))' }}>
            <AlertTriangle size={30} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <p className="text-base font-bold mb-1.5" style={{ color: 'var(--color-text-1)' }}>Something went wrong</p>
            <p className="text-sm" style={{ color: 'var(--color-text-3)', lineHeight: 1.6 }}>
              This screen hit an unexpected error. You can retry or reload the app.
            </p>
            {import.meta.env?.DEV && (
              <pre className="mt-3 text-left text-[11px] whitespace-pre-wrap break-all rounded-lg p-2" style={{ background: 'var(--color-hover)', color: 'var(--color-text-3)', maxHeight: 160, overflow: 'auto' }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
              style={{ color: 'var(--color-text-2)', background: 'var(--color-hover)' }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: 'var(--accent-600,#2563eb)' }}
            >
              <RefreshCw size={14} /> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
