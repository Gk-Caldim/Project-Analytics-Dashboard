import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useQuery } from '@tanstack/react-query';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
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
        root.setAttribute('data-theme', theme.displayMode);
        root.classList.toggle('dark', theme.displayMode === 'dark');
        
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
        if (settings) {
            const newTheme = { ...themeSettings };
            settings.forEach(s => {
                if (s.key === 'primary_color') newTheme.primaryColor = s.value;
                if (s.key === 'secondary_color') newTheme.secondaryColor = s.value;
                if (s.key === 'display_mode') newTheme.displayMode = s.value;
                if (s.key === 'company_name') newTheme.companyName = s.value;
                if (s.key === 'company_logo') newTheme.companyLogo = s.value;
            });
            
            setThemeSettings(newTheme);
            applyTheme(newTheme);
        }
    }, [settings]);

    const updateThemeLocally = (newSettings) => {
        const updated = { ...themeSettings, ...newSettings };
        setThemeSettings(updated);
        applyTheme(updated);
    };

    return (
        <ThemeContext.Provider value={{ themeSettings, updateThemeLocally, refreshTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
