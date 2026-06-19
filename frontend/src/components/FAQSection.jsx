import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is the CALDIM Project Dashboard?",
    a: "CALDIM is a project management and tracking platform built for software engineering teams. It integrates data, automatically generates meeting summaries, tracks resource allocation, and keeps cross-functional teams aligned.",
  },
  {
    q: "How does CALDIM compare to general project management tools?",
    a: "Unlike general-purpose task managers, CALDIM is designed specifically for software engineering workflows. It offers direct CI/CD and data integration, automated action-item extraction from meetings, and structured resource-tracking systems.",
  },
  {
    q: "Can I import multiple spreadsheets at once?",
    a: "Yes, CALDIM supports importing multiple project spreadsheets, combining them into a single, searchable web view with filters, status flags, and update histories.",
  },
  {
    q: "How does the automated meeting notes feature work?",
    a: "You can record meetings directly on the platform or upload audio files. The system transcribes the conversation, identifies key discussion points, and highlights assigned action items for your team.",
  },
  {
    q: "Is project data secure on the platform?",
    a: "Yes, CALDIM uses standard security protocols including encrypted data storage, role-based access controls, and detailed audit logs to ensure your project files remain secure.",
  },
  {
    q: "What resource-tracking features are available?",
    a: "The platform lets you set resource allocation limits, log team expenses, monitor updates, and receive alerts when project spend nears or exceeds targets.",
  },
  {
    q: "Is there a trial available?",
    a: "Yes, we offer a 30-day trial to help you evaluate the platform. Our team is available to assist with onboarding and setting up your initial spreadsheets.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 zoho-section-white zoho-font-sans">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <h2 className="zoho-h2 text-center mb-16">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-slate-200/80 shadow-md shadow-slate-100"
                    : "border-slate-100 hover:border-slate-200 shadow-sm"
                }`}
              >
                <button
                  className="group w-full flex items-center justify-between px-6 py-4.5 text-left cursor-pointer transition-colors hover:bg-slate-50/40"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span className={`text-[15px] font-bold transition-colors pr-4 ${
                    isOpen ? "text-blue-600" : "text-slate-800 group-hover:text-blue-600"
                  }`}>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 transition-transform duration-350 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-[14.5px] zoho-body leading-relaxed border-t border-slate-50 pt-3.5 animate-in fade-in slide-in-from-top-2 duration-250">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
