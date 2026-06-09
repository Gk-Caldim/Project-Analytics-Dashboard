import React from 'react';
import { RefreshCcw, Mail } from 'lucide-react';

function ServerOfflineView({ 
  title = "Server Connection Lost", 
  description = "We're having trouble connecting to the server. Please try again in few minutes.",
  onRetry = () => window.location.reload()
}) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (e) {
      console.error(e);
    } finally {
      // Keep loading spinner for at least 800ms for visual feedback
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#090d16] p-6 selection:bg-indigo-100 dark:selection:bg-indigo-950/50 font-sans">
      <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 p-8 md:p-12 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] max-w-xl w-full relative overflow-hidden flex flex-col items-center">
        <div className="relative flex flex-col items-center text-center w-full">
          {/* Static Illustration Container */}
          <div className="w-full max-w-sm mb-10 flex justify-center">
            <img 
              src="/server_down_svg.svg" 
              alt="Server Offline" 
              className="max-h-52 w-auto object-contain filter drop-shadow-[0_4px_12px_rgba(9,8,20,0.02)]"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-white mb-3 tracking-tight">
            {title}
          </h2>
          
          {/* Description */}
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-[15px] md:text-base leading-relaxed">
            {description}
          </p>

          {/* Action Button */}
          <div className="w-full max-w-xs">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`w-full h-12 flex items-center justify-center gap-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md ${
                isRetrying 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#0f172a] hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              <RefreshCcw className={`size-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Checking connection...' : 'Retry Connection'}
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/60 w-full flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Mail className="size-3.5" />
            <span>Support:</span>
            <a 
              href="mailto:support@industrialanalytics.com" 
              className="font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline decoration-slate-200 dark:decoration-slate-700 underline-offset-4 hover:decoration-indigo-600"
            >
              support@industrialanalytics.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerOfflineView;
