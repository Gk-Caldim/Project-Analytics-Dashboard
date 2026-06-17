import { useState } from "react";
import { ArrowRight, Settings2, Tag } from "lucide-react";

const customizeOptions = [
  { label: "Customize projects", active: true },
  { label: "Automate workflows", active: false },
];

function CustomFieldsMockup() {
  const fields = [
    { name: "Vehicle Platform", type: "Text", value: "Atlas EV-3" },
    { name: "Program Phase", type: "Dropdown", value: "Engineering Validation" },
    { name: "Target SOP Date", type: "Date", value: "2025-Q4" },
    { name: "Budget (USD)", type: "Currency", value: "$4.2M" },
    { name: "Risk Level", type: "Status", value: "Medium" },
    { name: "Lead Engineer", type: "User", value: "T. Ramirez" },
  ];

  const typeColors = {
    Text: "bg-gray-100 text-gray-600",
    Dropdown: "bg-purple-100 text-purple-600",
    Date: "bg-blue-100 text-blue-600",
    Currency: "bg-green-100 text-green-600",
    Status: "bg-orange-100 text-orange-600",
    User: "bg-pink-100 text-pink-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">Program Custom Fields</div>
        <button className="flex items-center gap-1.5 text-xs text-blue-600 font-medium cursor-pointer">
          <Settings2 className="w-3.5 h-3.5" />
          Edit Fields
        </button>
      </div>
      <div className="p-5 space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center gap-4">
            <div className="w-36 text-xs text-gray-500 flex-shrink-0">{field.name}</div>
            <div
              className={`text-[10px] px-2 py-0.5 rounded ${typeColors[field.type] || "bg-gray-100 text-gray-500"} flex-shrink-0`}
            >
              {field.type}
            </div>
            <div className="flex-1 text-xs text-gray-800 font-medium">{field.value}</div>
          </div>
        ))}
        <div className="pt-2 border-t border-dashed border-gray-200">
          <button className="flex items-center gap-1.5 text-xs text-blue-500 cursor-pointer">
            <span className="text-lg leading-none">+</span> Add custom field
          </button>
        </div>
      </div>

      {/* Status builder */}
      <div className="border-t border-gray-100 p-5">
        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Custom Statuses
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Concept", color: "bg-gray-200 text-gray-700" },
            { label: "Engineering", color: "bg-blue-100 text-blue-700" },
            { label: "Prototype", color: "bg-purple-100 text-purple-700" },
            { label: "Validation", color: "bg-orange-100 text-orange-700" },
            { label: "SOP Ready", color: "bg-green-100 text-green-700" },
          ].map((s) => (
            <div
              key={s.label}
              className={`text-[11px] px-3 py-1 rounded-full font-medium ${s.color}`}
            >
              {s.label}
            </div>
          ))}
          <div className="text-[11px] px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 cursor-pointer">
            + Add status
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomizeSection({ onRequestDemo }) {
  const [activeOption, setActiveOption] = useState(0);

  const handleLearnMore = (e) => {
    e.preventDefault();
    if (onRequestDemo) {
      onRequestDemo("sales", "Project Customization Inquiry");
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tab toggle */}
        <div className="flex justify-center mb-12 animate-in fade-in duration-300">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {customizeOptions.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setActiveOption(i)}
                className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeOption === i
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left — text */}
          <div className="flex-1 max-w-md animate-in fade-in duration-300">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Customize your
              <br />
              experience
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Build your projects from end-to-end to capture unique automotive requirements.
              Create custom fields, statuses, and workflows to manage and track industry-specific
              milestones, budget gates, and phase reviews — all tailored to how your engineering
              teams actually work.
            </p>
            <a
              href="#"
              onClick={handleLearnMore}
              className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:gap-2.5 transition-all mb-8"
            >
              Learn more about project customization <ArrowRight className="w-4 h-4" />
            </a>

            {/* Feature bullets */}
            <div className="space-y-3">
              {[
                "Custom fields for every automotive program attribute",
                "Phase-gate status workflows built for OEM processes",
                "Role-based views for engineering, finance, and management",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div className="text-sm text-gray-600">{item}</div>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="mt-8 p-5 bg-gray-50 rounded-xl border-l-4 border-blue-600">
              <p className="text-sm text-gray-600 italic leading-relaxed">
                "We mapped our entire APQP phase-gate process directly into CALDIM. The flexibility
                to add custom fields for PPAP tracking was exactly what we needed."
              </p>
              <div className="mt-3 text-xs text-gray-500">
                — Quality Engineering Lead, Early Access Partner
              </div>
            </div>
          </div>

          {/* Right — mockup */}
          <div className="flex-1 w-full animate-in fade-in duration-500">
            <CustomFieldsMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
