import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Shown in the fallback so the user knows which area failed */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Tab-level crash isolation: a render error in one lazy tab shows a
 * recovery card instead of blanking the whole app. "重试" resets the
 * boundary (and unmounts the failed subtree) without losing app state.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-14 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-warn/10 text-warn flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" strokeWidth={1.6} />
          </div>
          <h3 className="text-headline font-bold text-ink mt-4">
            {this.props.label ? `「${this.props.label}」出现了问题` : '页面出现了问题'}
          </h3>
          <p className="text-caption text-ink-2 mt-1.5 max-w-[280px] leading-relaxed">
            数据安全无虞。点击重试重新加载此页面，若反复出现请反馈。
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-white text-sub font-semibold shadow-glow-accent tactile-press"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重试</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
