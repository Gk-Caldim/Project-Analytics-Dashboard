import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// CALDIM logo: 2x2 grid of colored squares + wordmark
export const Logo = ({ className, dark = false }) => {
  return (
    <Link
      to="/"
      data-testid="brand-logo"
      className={cn("flex items-center gap-2.5 group", className)}
      aria-label="CALDIM home"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <span className="grid grid-cols-2 gap-[3px] p-1 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5 transition-transform duration-300 group-hover:rotate-6">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-blue-600" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-[3px] bg-emerald-500" />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-heading font-extrabold tracking-tight text-[19px]",
            dark ? "text-white" : "text-slate-900"
          )}
        >
          CALDIM
        </span>
        <span
          className={cn(
            "block text-[10px] font-semibold tracking-[0.22em] uppercase",
            dark ? "text-slate-400" : "text-slate-400"
          )}
        >
          Project Dashboard
        </span>
      </span>
    </Link>
  );
};

export default Logo;
