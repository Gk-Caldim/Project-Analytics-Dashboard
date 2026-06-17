import { useState } from "react";
import { ChevronDown, Menu, X, Zap } from "lucide-react";

const navItems = [
  { label: "Solutions", hasDropdown: true },
  { label: "Features", hasDropdown: true },
  { label: "Pricing", hasDropdown: false },
  { label: "Resources", hasDropdown: true },
];

export function Navbar({ onSignIn, onRequestDemo, onAccessProjects }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const toggleDropdown = (label) => {
    if (activeDropdown === label) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(label);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.location.assign("/")}>
            <div className="flex items-center gap-1">
              <div className="grid grid-cols-2 gap-0.5 w-7 h-7">
                <div className="bg-blue-600 rounded-sm animate-pulse" />
                <div className="bg-red-500 rounded-sm" />
                <div className="bg-yellow-400 rounded-sm" />
                <div className="bg-green-500 rounded-sm" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">CALDIM</div>
              <div className="text-sm font-bold text-gray-900 -mt-0.5">Project Dashboard</div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.hasDropdown ? (
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
                  >
                    {item.label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <a
                    href="#features"
                    onClick={(e) => {
                      if (item.label === "Pricing") {
                        e.preventDefault();
                        onRequestDemo && onRequestDemo("sales", "Pricing Inquiry");
                      }
                    }}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {item.label}
                  </a>
                )}

                {/* Dropdown Menu */}
                {item.hasDropdown && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        setActiveDropdown(null);
                        onRequestDemo && onRequestDemo("sales", `${item.label} Discussion`);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span>CALDIM {item.label}</span>
                      <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveDropdown(null);
                        onRequestDemo && onRequestDemo("sales", `General ${item.label}`);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Enterprise Settings
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onRequestDemo}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-all hover:shadow-md cursor-pointer"
            >
              Request Demo
            </button>
          </div>

          {/* Mobile Menu Toggler */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {mobileOpen ? <X className="w-6 h-6 animate-in spin-in-90 duration-200" /> : <Menu className="w-6 h-6 animate-in fade-in duration-200" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-4 px-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="space-y-3">
            {navItems.map((item) => (
              <div key={item.label} className="py-1">
                <button
                  onClick={() => {
                    if (item.label === "Pricing") {
                      setMobileOpen(false);
                      onRequestDemo && onRequestDemo("sales", "Pricing Inquiry");
                    } else {
                      toggleDropdown(item.label);
                    }
                  }}
                  className="w-full flex items-center justify-between text-left text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <span>{item.label}</span>
                  {item.hasDropdown && <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />}
                </button>

                {item.hasDropdown && activeDropdown === item.label && (
                  <div className="pl-4 mt-2 space-y-2 border-l border-gray-100">
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        onRequestDemo && onRequestDemo("sales", `${item.label} Discussion`);
                      }}
                      className="block text-xs text-gray-500 hover:text-gray-900"
                    >
                      CALDIM {item.label}
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        onRequestDemo && onRequestDemo("sales", `General ${item.label}`);
                      }}
                      className="block text-xs text-gray-500 hover:text-gray-900"
                    >
                      Enterprise Settings
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileOpen(false);
                onSignIn && onSignIn();
              }}
              className="w-full text-center py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileOpen(false);
                onRequestDemo && onRequestDemo();
              }}
              className="w-full text-center py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Request Demo
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
