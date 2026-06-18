export function CTASection({ onAccessProjects }) {
  return (
    <section className="py-28 bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto px-6 text-center animate-in fade-in duration-500">
        <h2 className="text-4xl lg:text-5xl font-heading font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
          Project management,
          <br />
          as effective as it gets.
        </h2>
        <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">
          Set up your workspace in under 10 minutes. Start with CALDIM Project Dashboard today.
        </p>
        <button 
          onClick={onAccessProjects}
          className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-blue-500/10"
        >
          ACCESS CALDIM DASHBOARD
        </button>
      </div>
    </section>
  );
}
