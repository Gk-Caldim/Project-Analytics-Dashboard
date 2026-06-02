import React from 'react';

import { AlertOctagon, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 selection:bg-rose-100">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 p-10 rounded-3xl shadow-2xl max-w-2xl w-full relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 bg-rose-50 dark:bg-rose-900/10 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="size-20 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-8 rotate-3">
                <AlertOctagon className="size-10 text-rose-600 dark:text-rose-400" />
              </div>

              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Systems Encountered an Error
              </h2>
              
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-lg leading-relaxed">
                A critical exception was caught by the monitoring layer. Our engineers have been notified.
              </p>

              {this.state.error && (
                <div className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl mb-8 text-left group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-2 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stack Trace Information</span>
                  </div>
                  <div className="max-h-48 overflow-auto custom-scrollbar">
                    <p className="font-mono text-sm text-rose-700 dark:text-rose-400 font-bold mb-2">
                      {this.state.error.toString()}
                    </p>
                    <pre className="text-[11px] font-mono text-slate-500 dark:text-slate-500 leading-tight">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 h-14 flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10"
                >
                  <RefreshCcw className="size-4" />
                  Attempt Recovery
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 h-14 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  <Home className="size-4" />
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
