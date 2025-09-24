'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { WhiteLabelBranding } from '@/types/funifier';
import { themeService, ThemeState } from '@/services/theme.service';

interface ThemeContextValue {
  theme: ThemeState;
  branding: WhiteLabelBranding | null;
  isLoaded: boolean;
  loadTheme: (instanceId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  instanceId?: string;
  initialBranding?: WhiteLabelBranding;
}

export function ThemeProvider({ children, instanceId, initialBranding }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeState>(() => {
    const currentTheme = themeService.getCurrentTheme();
    
    // If we have initial branding, apply it immediately
    if (initialBranding && instanceId && !currentTheme.isLoaded) {
      themeService.applyTheme(instanceId, initialBranding, { updateDOM: false });
      return {
        isLoaded: true,
        instanceId,
        branding: initialBranding,
        cssProperties: themeService.getCurrentTheme().cssProperties
      };
    }
    
    return currentTheme;
  });

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  // Load theme on mount if instanceId is provided
  useEffect(() => {
    if (instanceId && !theme.isLoaded) {
      loadTheme(instanceId);
    }
  }, [instanceId, theme.isLoaded]);

  // Apply theme to DOM when it changes
  useEffect(() => {
    if (theme.isLoaded && theme.cssProperties && typeof window !== 'undefined') {
      // Apply CSS custom properties to document root
      const root = document.documentElement;
      Object.entries(theme.cssProperties).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Update favicon if available
      if (theme.branding?.favicon) {
        updateFavicon(theme.branding.favicon);
      }

      // Update page title if company name is available
      if (theme.branding?.companyName) {
        updatePageTitle(theme.branding.companyName);
      }

      // Add theme class to body
      document.body.classList.add('white-label-theme');
    }
  }, [theme]);

  const loadTheme = async (instanceId: string) => {
    try {
      await themeService.loadTheme(instanceId);
    } catch (error) {
      console.error('Failed to load theme in provider:', error);
      // Apply default theme as fallback
      await themeService.applyDefaultTheme(instanceId);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }

    faviconLink.href = faviconUrl;
  };

  const updatePageTitle = (companyName: string) => {
    const currentTitle = document.title;
    const baseTitles = ['Dashboard', 'Ranking', 'History', 'Admin', 'Setup'];
    
    let newTitle = currentTitle;
    const foundBaseTitle = baseTitles.find(title => currentTitle.includes(title));
    
    if (foundBaseTitle) {
      newTitle = `${foundBaseTitle} - ${companyName}`;
    } else if (!currentTitle.includes(companyName)) {
      newTitle = `${currentTitle} - ${companyName}`;
    }

    document.title = newTitle;
  };

  const contextValue: ThemeContextValue = {
    theme,
    branding: theme.branding || null,
    isLoaded: theme.isLoaded,
    loadTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Higher-order component to wrap components with theme provider
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P>,
  options?: { instanceId?: string; initialBranding?: WhiteLabelBranding }
) {
  return function ThemedComponent(props: P) {
    return (
      <ThemeProvider instanceId={options?.instanceId} initialBranding={options?.initialBranding}>
        <Component {...props} />
      </ThemeProvider>
    );
  };
}