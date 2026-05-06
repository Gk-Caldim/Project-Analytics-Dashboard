import React from 'react';
import './tokens.css';

const TokenPreview = () => {
  const colors = [
    { label: 'Primary', var: '--mom-primary' },
    { label: 'Gray 50', var: '--mom-gray-50' },
    { label: 'Gray 100', var: '--mom-gray-100' },
    { label: 'Gray 200', var: '--mom-gray-200' },
    { label: 'Gray 400', var: '--mom-gray-400' },
    { label: 'Gray 600', var: '--mom-gray-600' },
    { label: 'Gray 800', var: '--mom-gray-800' },
    { label: 'Risk', var: '--mom-risk' },
    { label: 'Pending', var: '--mom-pending' },
    { label: 'Resolved', var: '--mom-resolved' },
    { label: 'Total', var: '--mom-total' },
  ];

  const typography = [
    { label: 'Heading (24px)', var: '--mom-font-heading' },
    { label: 'Subheading (18px)', var: '--mom-font-subheading' },
    { label: 'Body (14px)', var: '--mom-font-body' },
    { label: 'Caption (12px)', var: '--mom-font-caption' },
  ];

  const spacing = [
    { label: 'Base/1 (4px)', var: '--mom-space-1' },
    { label: '2 (8px)', var: '--mom-space-2' },
    { label: '3 (12px)', var: '--mom-space-3' },
    { label: '4 (16px)', var: '--mom-space-4' },
    { label: '6 (24px)', var: '--mom-space-6' },
    { label: '8 (32px)', var: '--mom-space-8' },
    { label: '12 (48px)', var: '--mom-space-12' },
  ];

  return (
    <div className="mom-theme" style={{
      padding: 'var(--mom-space-6)',
      background: 'white',
      fontFamily: 'var(--mom-font-family)',
      borderBottom: '1px solid var(--mom-gray-200)',
    }}>
      <h2 style={{ fontSize: 'var(--mom-font-heading)', color: 'var(--mom-gray-800)', marginBottom: 'var(--mom-space-6)' }}>
        MOM Design Token Preview
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--mom-space-8)' }}>
        
        {/* Colors */}
        <section>
          <h3 style={{ fontSize: 'var(--mom-font-subheading)', color: 'var(--mom-gray-600)', marginBottom: 'var(--mom-space-4)' }}>Colors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--mom-space-3)' }}>
            {colors.map(c => (
              <div key={c.var} style={{
                background: `var(${c.var})`,
                color: c.var.includes('50') || c.var.includes('100') || c.var.includes('200') ? 'var(--mom-gray-800)' : 'white',
                padding: 'var(--mom-space-3)',
                borderRadius: 'var(--mom-radius-badge)',
                fontSize: 'var(--mom-font-caption)',
                fontWeight: 600,
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mom-space-1)'
              }}>
                <span>{c.label}</span>
                <span style={{ opacity: 0.8, fontSize: '10px' }}>{c.var}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h3 style={{ fontSize: 'var(--mom-font-subheading)', color: 'var(--mom-gray-600)', marginBottom: 'var(--mom-space-4)' }}>Typography (Inter)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mom-space-4)' }}>
            {typography.map(t => (
              <div key={t.var} style={{ borderBottom: '1px solid var(--mom-gray-100)', paddingBottom: 'var(--mom-space-2)' }}>
                <div style={{ fontSize: 'var(--mom-font-caption)', color: 'var(--mom-gray-400)', marginBottom: 'var(--mom-space-1)' }}>{t.label} / {t.var}</div>
                <div style={{ fontSize: `var(${t.var})`, color: 'var(--mom-gray-800)', fontWeight: t.label.includes('Heading') ? 700 : 400 }}>
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing */}
        <section>
          <h3 style={{ fontSize: 'var(--mom-font-subheading)', color: 'var(--mom-gray-600)', marginBottom: 'var(--mom-space-4)' }}>Spacing Scale</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mom-space-3)' }}>
            {spacing.map(s => (
              <div key={s.var} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mom-space-4)' }}>
                <div style={{ 
                  width: `var(${s.var})`, 
                  height: '24px', 
                  background: 'var(--mom-primary)',
                  borderRadius: '2px'
                }}></div>
                <div style={{ fontSize: 'var(--mom-font-caption)', color: 'var(--mom-gray-600)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Radii & Shadows */}
        <section>
          <h3 style={{ fontSize: 'var(--mom-font-subheading)', color: 'var(--mom-gray-600)', marginBottom: 'var(--mom-space-4)' }}>Components (Radii & Shadows)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mom-space-6)' }}>
            
            <div style={{
              background: 'var(--mom-gray-50)',
              padding: 'var(--mom-space-4)',
              borderRadius: 'var(--mom-radius-card)',
              boxShadow: 'var(--mom-shadow-card)',
              border: '1px solid var(--mom-gray-200)',
            }}>
              <div style={{ fontSize: 'var(--mom-font-body)', color: 'var(--mom-gray-800)', fontWeight: 600 }}>Card Component</div>
              <div style={{ fontSize: 'var(--mom-font-caption)', color: 'var(--mom-gray-400)', marginTop: 'var(--mom-space-1)' }}>
                Radius: var(--mom-radius-card) <br/>
                Shadow: var(--mom-shadow-card)
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--mom-space-4)', alignItems: 'center' }}>
              <button style={{
                background: 'var(--mom-primary)',
                color: 'white',
                border: 'none',
                padding: 'var(--mom-space-2) var(--mom-space-4)',
                borderRadius: 'var(--mom-radius-button)',
                fontSize: 'var(--mom-font-body)',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Button (var--mom-radius-button)
              </button>
              
              <span style={{
                background: 'var(--mom-gray-100)',
                color: 'var(--mom-gray-800)',
                padding: 'var(--mom-space-1) var(--mom-space-2)',
                borderRadius: 'var(--mom-radius-badge)',
                fontSize: 'var(--mom-font-caption)',
                fontWeight: 600
              }}>
                Badge (var--mom-radius-badge)
              </span>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default TokenPreview;
