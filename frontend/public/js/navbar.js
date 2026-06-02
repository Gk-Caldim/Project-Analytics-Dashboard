/**
 * Industrial Analytics Workspace - Navbar & Navigation Manager
 * Handles link wiring, active state highlighting, and smooth scrolling.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Wire Nav Links
    const navLinks = [
        { id: 'nav-products', path: '/products.html' },
        { id: 'nav-customers', path: '/customers.html' },
        { id: 'nav-pricing', path: '/pricing.html' },
        { id: 'nav-enterprise', path: '/enterprise.html' },
        { id: 'nav-signin', path: '/signin.html' }
    ];

    navLinks.forEach(link => {
        const el = document.getElementById(link.id);
        if (el) {
            el.setAttribute('href', link.path);
        }
    });

    // 2. Highlight Active Item
    const currentPath = window.location.pathname;
    const allLinks = document.querySelectorAll('.zoho-nav-link, .nav-link');
    
    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.endsWith(href)) {
            link.classList.add('active');
        }
    });

    // 3. Smooth scroll for same-page anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Access Workspace Button Logic
    const accessBtn = document.getElementById('access-workspace-btn');
    if (accessBtn) {
        accessBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = window.Auth?.getUser();
            if (user && user.loggedIn) {
                window.location.href = '/dashboard.html';
            } else {
                window.location.href = '/signin.html';
            }
        });
    }

    // 5. Page Fade-in Effect (150ms)
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.15s ease-in-out';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
});
