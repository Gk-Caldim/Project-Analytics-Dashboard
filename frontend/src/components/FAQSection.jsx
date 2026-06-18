import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is CALDIM Project Dashboard?",
    a: "CALDIM Project Dashboard is a project governance and engineering analytics platform designed specifically for manufacturing, automotive, and engineering teams. It helps you sync design release spreadsheets, record and transcribe AI-powered Minutes of Meetings, manage multi-currency budgets, and coordinate cross-plant operations.",
  },
  {
    q: "How is CALDIM different from generic project management tools?",
    a: "CALDIM is built with actual engineering files and workflows in mind. Unlike generic task list applications, CALDIM features direct Excel sheet cell synchronization, built-in browser-based voice recorders with automatic AI transcription for meeting records, and detailed budget master currency controls.",
  },
  {
    q: "Can I sync multiple Excel sheets simultaneously?",
    a: "Yes. CALDIM supports importing and parsing multiple design release Excel workbooks simultaneously, giving you a unified web-based tabular view with instant cell search, advanced column filters, and team status logs.",
  },
  {
    q: "Does CALDIM include AI transcription for meetings?",
    a: "Absolutely. The Minutes of Meetings (MOM) module allows you to record meetings directly in-app or view generated transcript files. The system automatically transcribes audio, structures transcripts by speaker, and generates action logs.",
  },
  {
    q: "Is CALDIM Project Dashboard secure enough for confidential engineering data?",
    a: "Absolutely. CALDIM is built with enterprise-grade security: end-to-end encryption, granular role-based access controls (RBAC), secure activity logs, and secure database backends protecting your program IP.",
  },
  {
    q: "What kind of budget controls are available?",
    a: "The Budget Master module supports setting program allocations, managing multi-currency exchange rates, tracking employee expenditure records, and issuing automated budget variance alerts before programs exceed thresholds.",
  },
  {
    q: "Is there a free trial available?",
    a: "Yes. You can start a 30-day free trial with no credit card required. Our onboarding team will help you configure your database and map your existing Excel sheets to ensure a smooth transition.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 zoho-section-white zoho-font-sans">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <h2 className="zoho-h2 text-center mb-16">
          Project Management Software FAQs
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
