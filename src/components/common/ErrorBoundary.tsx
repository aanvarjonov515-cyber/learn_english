import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2D9] rounded-2xl max-w-md w-full p-8 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl text-gray-900">
              Kutilmagan xatolik yuz berdi
            </h2>
            <p className="text-xs text-gray-600">
              Ilovada kutilmagan uzilish sodir bo'ldi. Ma'lumotlaringiz xavfsiz saqlangan.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-gray-50 rounded-lg text-[11px] text-gray-600 text-left font-mono overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
