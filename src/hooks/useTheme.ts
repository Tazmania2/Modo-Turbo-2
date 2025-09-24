import { useState, useEffect, useCallback } from 'react';
import { WhiteLabelBranding } from '@/types/funifier';
import { themeService, ThemeState } from '@/services/theme.service';
import { brandingService } from '@/services/branding.service';

export interface UseThemeReturn {
  theme: ThemeState;
  branding: WhiteLabelBranding | null;
  isLoading: boolean;
  error: string | null;
  loadTheme: (instanceId: string) => Promise<void>;
  updateColors: (colors: { primary?: string; secondary?: string; accent?: string }) => Promise<void>;
  updateCompanyInfo: (info: { companyName?: string; tagline?: string }) => Promise<void>;
  updateLogo: (logoUrl: string) => Promise<void>;
  resetTheme: () => Promise<void>;
  exportConfig: () => Record<string, any>;
}

/**
 * Hook for managing white-label theme state and operations
 */
export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<ThemeState>(themeService.getCurrentTheme());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  // Load theme for instance
  const loadTheme = useCallback(async (instanceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await themeService.loadTheme(instanceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load theme');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update theme colors
  const updateColors = useCallback(async (colors: { primary?: string; secondary?: string; accent?: string }) => {
    setError(null);
    
    try {
      await themeService.updateColors(colors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update colors');
    }
  }, []);

  // Update company information
  const updateCompanyInfo = useCallback(async (info: { companyName?: string; tagline?: string }) => {
    setError(null);
    
    try {
      await themeService.updateCompanyInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company info');
    }
  }, []);

  // Update logo
  const updateLogo = useCallback(async (logoUrl: string) => {
    setError(null);
    
    try {
      await themeService.updateLogo(logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update logo');
    }
  }, []);

  // Reset theme to defaults
  const resetTheme = useCallback(async () => {
    setError(null);
    
    try {
      await themeService.resetTheme();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset theme');
    }
  }, []);

  // Export theme configuration
  const exportConfig = useCallback(() => {
    return themeService.exportThemeConfig();
  }, []);

  return {
    theme,
    branding: theme.branding || null,
    isLoading,
    error,
    loadTheme,
    updateColors,
    updateCompanyInfo,
    updateLogo,
    resetTheme,
    exportConfig
  };
}

/**
 * Hook for branding management operations (admin use)
 */
export function useBrandingAdmin(instanceId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBranding = useCallback(async (
    branding: Partial<WhiteLabelBranding>,
    userId: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await brandingService.updateBranding(instanceId, branding, userId);
      
      if (result.success) {
        // Reload theme to reflect changes
        await themeService.loadTheme(instanceId);
        return result;
      } else {
        setError(result.errors?.[0] || 'Failed to update branding');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update branding';
      setError(errorMessage);
      return { success: false, errors: [errorMessage] };
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  const uploadLogo = useCallback(async (logoFile: File, userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await brandingService.uploadLogo(instanceId, logoFile, userId);
      
      if (result.success) {
        // Reload theme to reflect changes
        await themeService.loadTheme(instanceId);
        return result;
      } else {
        setError(result.error || 'Failed to upload logo');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload logo';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  const uploadFavicon = useCallback(async (faviconFile: File, userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await brandingService.uploadFavicon(instanceId, faviconFile, userId);
      
      if (result.success) {
        // Reload theme to reflect changes
        await themeService.loadTheme(instanceId);
        return result;
      } else {
        setError(result.error || 'Failed to upload favicon');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload favicon';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  const resetToDefaults = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await brandingService.resetToDefaults(instanceId, userId);
      
      if (result.success) {
        // Reload theme to reflect changes
        await themeService.loadTheme(instanceId);
        return result;
      } else {
        setError(result.errors?.[0] || 'Failed to reset branding');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset branding';
      setError(errorMessage);
      return { success: false, errors: [errorMessage] };
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  return {
    isLoading,
    error,
    updateBranding,
    uploadLogo,
    uploadFavicon,
    resetToDefaults
  };
}