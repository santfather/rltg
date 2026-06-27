import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/** Catches runtime errors and offers level reset */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RETRO-UX critical error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'r' || event.key === 'R') {
      this.handleReset();
    }
  };

  componentDidMount(): void {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg-deep)] p-6 font-[family-name:var(--font-terminal)] text-[var(--crt-red)]">
        <p className="text-lg" style={{ textShadow: 'var(--glow-red)' }}>
          КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ
        </p>
        <p className="mt-4 max-w-lg text-center text-sm text-[var(--crt-amber)]">
          {this.state.message}
        </p>
        <button
          type="button"
          className="mt-8 text-[var(--crt-green)]"
          onClick={this.handleReset}
        >
          [R] — ПЕРЕЗАПУСТИТЬ С level_00
        </button>
      </div>
    );
  }
}
