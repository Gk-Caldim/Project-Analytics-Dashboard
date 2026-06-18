export function CTASection({ onAccessProjects }) {
  return (
    <section className="py-28 zoho-section-white zoho-font-sans">
      <div className="max-w-3xl mx-auto px-6 text-center animate-in fade-in duration-500">
        <h2 className="zoho-h2 text-4xl lg:text-5xl mb-6 text-center leading-tight tracking-tight">
          Streamline your project
          <br />
          governance today
        </h2>
        <p className="zoho-body text-lg mb-10 max-w-xl mx-auto text-center font-normal">
          Set up your workspace and bring clarity to your team's engineering projects.
        </p>
        <button 
          onClick={onAccessProjects}
          className="zoho-btn-red cursor-pointer active:scale-95 shadow-md"
        >
          Access Dashboard
        </button>
      </div>
    </section>
  );
}
