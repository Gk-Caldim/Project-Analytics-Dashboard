import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const MENUS = {
  Solutions: [
    { label: "Release Governance", desc: "SDLC & milestone tracking", path: "/governance" },
    { label: "Project Analytics", desc: "Sprint progress & risk metrics", path: "/analytics" },
    { label: "Enterprise Platform", desc: "Built for scale and security", path: "/enterprise" },
  ],
  Features: [
    { label: "Spreadsheet Sync", desc: "Connect sheet data to database", path: "/analytics" },
    { label: "AI Meeting Minutes", desc: "Auto-generated summaries & actions", path: "/meetings" },
    { label: "Budget Tracking", desc: "Track project burn rates & spend", path: "/budget" },
    { label: "Release Calendar", desc: "Visualize milestones & sprint gates", path: "/governance" },
  ],
  Resources: [
    { label: "Documentation", desc: "Guides & API reference", path: "/info/documentation" },
    { label: "Success Stories", desc: "Customer case studies", path: "/customers" },
    { label: "Webinars", desc: "Live product walkthroughs", path: "/info/webinars" },
  ],
};

const scrollTo = (id) => {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

export const Navbar = ({ onSignIn, onRequestDemo, onAccessProjects }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleItem = (item) => {
    setOpen(null);
    setMobile(false);
    if (item.path) {
      navigate(item.path);
    } else if (item.to) {
      if (location.pathname === '/') {
        scrollTo(item.to);
      } else {
        navigate('/');
        // Delay to allow page load before scroll
        setTimeout(() => scrollTo(item.to), 200);
      }
    } else {
      onRequestDemo(item.inquiry || "Learn More");
    }
  };

  return (
    <header
      data-testid="navbar"
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm"
          : "bg-white/40 backdrop-blur-[12px] border-b border-slate-200/50"
      )}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between">
        <Logo />

        {/* Center links */}
        <div className="hidden lg:flex items-center gap-1" onMouseLeave={() => setOpen(null)}>
          {Object.keys(MENUS).map((key) => (
            <div key={key} className="relative" onMouseEnter={() => setOpen(key)}>
              <button
                data-testid={`nav-${key.toLowerCase()}`}
                className="flex items-center gap-1 px-4 py-2 text-[15px] font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {key}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    open === key && "rotate-180 text-blue-600"
                  )}
                />
              </button>
              <AnimatePresence>
                {open === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full pt-2 w-[320px]"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/5 p-2">
                      {MENUS[key].map((item) => (
                        <button
                          key={item.label}
                          data-testid={`nav-item-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                          onClick={() => handleItem(item)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer"
                        >
                          <span className="block text-[14px] font-semibold text-slate-900 group-hover:text-blue-600">
                            {item.label}
                          </span>
                          <span className="block text-[12.5px] text-slate-500">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <button
            data-testid="nav-pricing"
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 text-[15px] font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            Pricing
          </button>
        </div>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            data-testid="nav-signin"
            onClick={onSignIn}
            className="px-4 py-2 text-[15px] font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            data-testid="nav-request-demo"
            onClick={() => onRequestDemo("Request Demo")}
            className="px-5 py-2.5 text-[15px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            Request Demo
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          data-testid="nav-mobile-toggle"
          onClick={() => setMobile((m) => !m)}
          className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            data-testid="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-white border-t border-slate-200"
          >
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {Object.entries(MENUS).map(([key, items]) => (
                <div key={key}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{key}</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleItem(item)}
                        className="block w-full text-left py-1.5 text-[15px] font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setMobile(false); navigate('/pricing'); }}
                className="block w-full text-left py-1.5 text-[15px] font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                Pricing
              </button>
              <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
                <button
                  onClick={() => { setMobile(false); onSignIn(); }}
                  className="w-full py-2.5 text-[15px] font-semibold text-slate-700 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobile(false); onRequestDemo("Request Demo"); }}
                  className="w-full py-2.5 text-[15px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
                >
                  Request Demo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
