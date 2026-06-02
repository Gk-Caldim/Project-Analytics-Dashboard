/**
 * Industrial Analytics Workspace - Auth Manager (Production Integration)
 * Manages user sessions via FastAPI Backend and localStorage.
 */
const Auth = {
    BASE_URL: 'http://localhost:8000', // Updated to match user's terminal port
    SESSION_KEY: 'iaw_user_session',
    TOKEN_KEY: 'iaw_access_token',
    
    VALID_PAGES: [
        '/', '/index.html', '/signin.html', '/pricing.html', 
        '/enterprise.html', '/dashboard.html', '/forgot-password.html', 
        '/request-access.html', '/products.html', '/customers.html', '/404.html'
    ],

    PROTECTED_PAGES: [
        '/dashboard.html', '/analytics.html', '/meetings.html', 
        '/budget.html', '/team.html'
    ],

    async login(email, password) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Login failed');
            }

            const data = await response.json();
            
            // Save token and user info
            localStorage.setItem(this.TOKEN_KEY, data.access_token);
            localStorage.setItem(this.SESSION_KEY, JSON.stringify({
                ...data.user,
                loggedIn: true
            }));

            // Redirect to dashboard
            window.location.href = '/dashboard.html';
            return { success: true };
        } catch (error) {
            console.error('Auth Error:', error);
            throw error;
        }
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        window.location.href = '/signin.html';
    },

    async check() {
        const session = this.getUser();
        const token = localStorage.getItem(this.TOKEN_KEY);
        const currentPath = window.location.pathname;
        
        // 1. 404 Catch-all
        const isValid = this.VALID_PAGES.some(page => 
            currentPath === page || currentPath.endsWith(page)
        );
        
        if (!isValid && !currentPath.includes('/js/') && !currentPath.includes('/css/')) {
            window.location.href = '/404.html';
            return false;
        }

        // 2. Auth Check
        const isProtected = this.PROTECTED_PAGES.some(path => currentPath.endsWith(path));
        
        if (isProtected) {
            if (!session || !token) {
                window.location.href = '/signin.html';
                return false;
            }

            // Verify token with /me endpoint
            try {
                const res = await fetch(`${this.BASE_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Session expired');
                const userData = await res.json();
                localStorage.setItem(this.SESSION_KEY, JSON.stringify({ ...userData, loggedIn: true }));
            } catch (e) {
                this.logout();
                return false;
            }
        }

        // 3. Redirect if already logged in and on guest pages
        if (session && session.loggedIn && (currentPath.endsWith('/signin.html') || currentPath.endsWith('/request-access.html'))) {
            window.location.href = '/dashboard.html';
        }

        return true;
    },

    getUser() {
        const data = localStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }
};

// Start auth check
Auth.check();

window.Auth = Auth;
