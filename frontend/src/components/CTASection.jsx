export function CTASection({ onAccessProjects }) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-in fade-in duration-500">
        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Project management,
          <br />
          as effective as it gets.
        </h2>
        <p className="text-gray-500 text-lg mb-8">
          Set up your workspace in under 10 minutes. Start with CALDIM Project Dashboard today.
        </p>
        <button 
          onClick={onAccessProjects}
          className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg text-white px-8 py-3.5 rounded font-semibold text-sm tracking-wide transition-all cursor-pointer active:scale-95"
        >
          ACCESS CALDIM DASHBOARD
        </button>
      </div>
    </section>
  );
}
