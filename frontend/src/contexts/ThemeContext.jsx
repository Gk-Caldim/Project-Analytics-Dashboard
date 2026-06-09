import React, { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import API from '../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const [themeSettings, setThemeSettings] = useState({
        primaryColor: '#6366f1',
        secondaryColor: '#0ea5e9',
        displayMode: 'light',
        companyName: 'Industrial Analytics Platform',
        companyLogo: ''
    });

    const { data: settings, refetch: refreshTheme } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const response = await API.get('/settings/');
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const applyTheme = (theme) => {
        const root = document.documentElement;
        const mode = (theme.displayMode || 'light').toLowerCase();
        root.setAttribute('data-theme', mode);
        root.classList.toggle('dark', mode === 'dark');
        
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        
        if (theme.primaryColor && theme.primaryColor.startsWith('#')) {
            const hex = theme.primaryColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            root.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
        }
    };

    useEffect(() => {
        if (settings && Array.isArray(settings)) {
            setThemeSettings(prev => {
                const newTheme = { ...prev };
                let changed = false;
                
                settings.forEach(s => {
                    if (s.key === 'primary_color' && newTheme.primaryColor !== s.value) { newTheme.primaryColor = s.value; changed = true; }
                    if (s.key === 'secondary_color' && newTheme.secondaryColor !== s.value) { newTheme.secondaryColor = s.value; changed = true; }
                    if (s.key === 'display_mode' && newTheme.displayMode !== s.value) { newTheme.displayMode = s.value; changed = true; }
                    if (s.key === 'company_name' && newTheme.companyName !== s.value) { newTheme.companyName = s.value; changed = true; }
                    if (s.key === 'company_logo' && newTheme.companyLogo !== s.value) { newTheme.companyLogo = s.value; changed = true; }
                });
                
                if (changed) {
                    applyTheme(newTheme);
                    return newTheme;
                }
                return prev;
            });
        }
    }, [settings]);
 
    useEffect(() => {
        const handleGlobalClick = (e) => {
            window.lastClickX = e.clientX;
            window.lastClickY = e.clientY;
        };
        window.addEventListener('click', handleGlobalClick, { capture: true });
        return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
    }, []);

    const updateThemeLocally = (newSettings) => {
        const newMode = newSettings.displayMode;
        const currentMode = themeSettings.displayMode;

        if (!newMode || newMode === currentMode || !document.startViewTransition) {
            const updated = { ...themeSettings, ...newSettings };
            setThemeSettings(updated);
            applyTheme(updated);
            return;
        }

        const x = window.lastClickX ?? window.innerWidth / 2;
        const y = window.lastClickY ?? window.innerHeight / 2;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        document.documentElement.classList.add('theme-transitioning');

        const transition = document.startViewTransition(() => {
            const updated = { ...themeSettings, ...newSettings };
            flushSync(() => {
                setThemeSettings(updated);
            });
            applyTheme(updated);
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ];
            
            document.documentElement.animate(
                {
                    clipPath: clipPath,
                },
                {
                    duration: 500,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });

        transition.finished.then(() => {
            document.documentElement.classList.remove('theme-transitioning');
        });
    };

    const toggleTheme = async (e) => {
        if (e && typeof e.clientX === 'number') {
            window.lastClickX = e.clientX;
            window.lastClickY = e.clientY;
        }
        const newMode = themeSettings.displayMode === 'dark' ? 'light' : 'dark';
        updateThemeLocally({ displayMode: newMode });
        
        queryClient.setQueryData(['settings'], old => {
            if (!old) return old;
            return old.map(s => s.key === 'display_mode' ? { ...s, value: newMode } : s);
        });
        
        try {
            const originalSetting = settings?.find(s => s.key === 'display_mode');
            await API.patch('/settings/bulk', {
                settings: [{
                    key: 'display_mode',
                    value: newMode,
                    category: originalSetting?.category || 'Branding',
                    type: originalSetting?.type || 'text'
                }]
            });
        } catch (error) {
            console.error('Error persisting theme change:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ themeSettings, updateThemeLocally, refreshTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
