import { Linkedin, Twitter, Youtube, Mail } from "lucide-react";

const footerColumns = [
  {
    heading: "Features",
    links: [
      "Task Management",
      "Excel Analytics",
      "Minutes of Meeting (MOM)",
      "Time Sheets",
      "Team Collaboration",
      "Goal Tracking",
      "Portfolio View",
      "Dashboards",
    ],
  },
  {
    heading: "Resources",
    links: [
      "Help Center",
      "Quick Start Guide",
      "API Documentation",
      "Video Tutorials",
      "Webinars",
      "Blog",
      "Changelog",
    ],
  },
  {
    heading: "Industry",
    links: [
      "OEM Programs",
      "Tier 1 Suppliers",
      "EV Development",
      "Defense & Aerospace",
      "R&D Labs",
      "Manufacturing Ops",
    ],
  },
  {
    heading: "Compare",
    links: [
      "vs. MS Project",
      "vs. Jira",
      "vs. Asana",
      "vs. Monday.com",
      "vs. Zoho Projects",
      "vs. Smartsheet",
    ],
  },
  {
    heading: "Company",
    links: [
      "About Us",
      "Careers",
      "Partner Program",
      "Security & Compliance",
      "Privacy Policy",
      "Terms of Service",
      "Contact",
    ],
  },
];

export function Footer({ onRequestDemo }) {
  const handleLinkClick = (e, link) => {
    e.preventDefault();
    if (onRequestDemo) {
      onRequestDemo("sales", `Footer: ${link}`);
    }
  };

  return (
    <footer className="zoho-section-white zoho-font-sans">
      {/* CTA bar */}
      <div className="bg-slate-900 py-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-slate-200 text-sm font-semibold">
            Become a Partner — grow with CALDIM's partner ecosystem
          </div>
          <button 
            onClick={(e) => handleLinkClick(e, "Partner Program")}
            className="text-xs font-bold bg-white text-slate-900 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm"
          >
            Join Partner Program
          </button>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Logo + description */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid grid-cols-2 gap-0.5 w-7 h-7">
                <div className="bg-blue-600 rounded-sm" />
                <div className="bg-emerald-500 rounded-sm" />
                <div className="bg-amber-500 rounded-sm" />
                <div className="bg-rose-500 rounded-sm" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">CALDIM</div>
              <div className="text-sm font-extrabold text-slate-900 -mt-0.5">Project Dashboard</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-2.5 mb-4 font-medium font-sans">
              Project governance and analytics built for engineering excellence.
            </p>
            <div className="flex gap-3">
              {[Linkedin, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => handleLinkClick(e, `Social ${i}`)}
                  className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 hover:bg-blue-600 hover:border-blue-600 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5">
                {col.heading}
              </div>
              <ul className="space-y-2.5 font-sans">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      onClick={(e) => handleLinkClick(e, link)}
                      className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Mail className="w-3.5 h-3.5" />
            <a href="mailto:support@caldim.com" className="hover:text-blue-600 transition-colors">
              support@caldim.com
            </a>
          </div>
         
          <div className="flex gap-4 text-xs text-gray-400">
            <a href="#" onClick={(e) => handleLinkClick(e, "Privacy")} className="hover:text-gray-600">Privacy</a>
            <a href="#" onClick={(e) => handleLinkClick(e, "Terms")} className="hover:text-gray-600">Terms</a>
            <a href="#" onClick={(e) => handleLinkClick(e, "Cookies")} className="hover:text-gray-600">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
