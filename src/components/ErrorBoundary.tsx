import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, ArrowLeft, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex items-center justify-center bg-bg-primary h-full min-h-[500px] p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-md w-full bg-bg-surface border border-border-primary rounded-2xl p-10 shadow-xl"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <ShieldAlert className="text-red-500" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-3">
              Data Loading Interrupted
            </h2>
            
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              We encountered an unexpected error while preparing your analytics. This could be due to malformed data or a missing demo dataset.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-bg-primary border border-border-primary text-text-primary rounded-lg text-sm font-semibold hover:border-text-primary transition-colors focus:ring-2 focus:ring-border-primary outline-none"
              >
                <ArrowLeft size={16} />
                Return to Home
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-text-primary text-bg-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity focus:ring-2 focus:ring-text-primary outline-none"
              >
                <RefreshCcw size={16} />
                Retry Loading
              </button>
            </div>

            {this.state.error && (
              <div className="mt-8 text-left w-full border-t border-border-primary pt-6">
                <details className="cursor-pointer group">
                  <summary className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors focus:outline-none flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-text-muted group-hover:bg-text-primary transition-colors" />
                    View technical details
                  </summary>
                  <pre className="mt-3 p-4 bg-bg-primary rounded-lg text-[11px] text-text-secondary overflow-x-auto border border-border-primary font-mono whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                </details>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
