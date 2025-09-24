import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, useBrandingAdmin } from '../useTheme';
import { themeService } from '@/services/theme.service';
import { brandingService } from '@/services/branding.service';
import { WhiteLabelBranding } from '@/types/funifier';

// Mock dependencies
vi.mock('@/services/theme.service');
vi.mock('@/services/branding.service');

const mockThemeService = themeService as {
  getCurrentTheme: Mock;
  subscribe: Mock;
  loadTheme: Mock;
  updateColors: Mock;
  updateCompanyInfo: Mock;
  updateLogo: Mock;
  resetTheme: Mock;
  exportThemeConfig: Mock;
};

const mockBrandingService = brandingService as {
  updateBranding: Mock;
  uploadLogo: Mock;
  uploadFavicon: Mock;
  resetToDefaults: Mock;
};

describe('useTheme', () => {
  const mockBranding: WhiteLabelBranding = {
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    accentColor: '#10B981',
    logo: 'https://example.com/logo.png',
    favicon: 'https://example.com/favicon.ico',
    companyName: 'Test Company',
    tagline: 'Test Tagline'
  };

  const mockTheme = {
    isLoaded: true,
    instanceId: 'test-instance',
    branding: mockBranding,
    cssProperties: {
      '--color-primary-500': '#3B82F6'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeService.getCurrentTheme.mockReturnValue(mockTheme);
    mockThemeService.subscribe.mockReturnValue(() => {});
  });

  it('should return current theme state', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toEqual(mockTheme);
    expect(result.current.branding).toEqual(mockBranding);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should subscribe to theme changes', () => {
    const mockUnsubscribe = vi.fn();
    mockThemeService.subscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useTheme());

    expect(mockThemeService.subscribe).toHaveBeenCalled();

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should load theme successfully', async () => {
    mockThemeService.loadTheme.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.loadTheme('test-instance');
    });

    expect(mockThemeService.loadTheme).toHaveBeenCalledWith('test-instance');
    expect(result.current.error).toBeNull();
  });

  it('should handle load theme errors', async () => {
    const error = new Error('Load failed');
    mockThemeService.loadTheme.mockRejectedValue(error);

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.loadTheme('test-instance');
    });

    expect(result.current.error).toBe('Load failed');
  });

  it('should update colors successfully', async () => {
    mockThemeService.updateColors.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTheme());

    const colors = { primary: '#FF0000' };

    await act(async () => {
      await result.current.updateColors(colors);
    });

    expect(mockThemeService.updateColors).toHaveBeenCalledWith(colors);
    expect(result.current.error).toBeNull();
  });

  it('should handle update colors errors', async () => {
    const error = new Error('Update failed');
    mockThemeService.updateColors.mockRejectedValue(error);

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.updateColors({ primary: '#FF0000' });
    });

    expect(result.current.error).toBe('Update failed');
  });

  it('should update company info successfully', async () => {
    mockThemeService.updateCompanyInfo.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTheme());

    const info = { companyName: 'New Company' };

    await act(async () => {
      await result.current.updateCompanyInfo(info);
    });

    expect(mockThemeService.updateCompanyInfo).toHaveBeenCalledWith(info);
  });

  it('should update logo successfully', async () => {
    mockThemeService.updateLogo.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTheme());

    const logoUrl = 'https://example.com/new-logo.png';

    await act(async () => {
      await result.current.updateLogo(logoUrl);
    });

    expect(mockThemeService.updateLogo).toHaveBeenCalledWith(logoUrl);
  });

  it('should reset theme successfully', async () => {
    mockThemeService.resetTheme.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.resetTheme();
    });

    expect(mockThemeService.resetTheme).toHaveBeenCalled();
  });

  it('should export theme config', () => {
    const mockConfig = { branding: mockBranding };
    mockThemeService.exportThemeConfig.mockReturnValue(mockConfig);

    const { result } = renderHook(() => useTheme());

    const config = result.current.exportConfig();

    expect(config).toEqual(mockConfig);
    expect(mockThemeService.exportThemeConfig).toHaveBeenCalled();
  });
});

describe('useBrandingAdmin', () => {
  const instanceId = 'test-instance';
  const userId = 'test-user';

  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeService.loadTheme.mockResolvedValue(undefined);
  });

  it('should update branding successfully', async () => {
    const mockResult = {
      success: true,
      branding: mockBranding
    };
    mockBrandingService.updateBranding.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    const branding = { companyName: 'New Company' };

    await act(async () => {
      const updateResult = await result.current.updateBranding(branding, userId);
      expect(updateResult).toEqual(mockResult);
    });

    expect(mockBrandingService.updateBranding).toHaveBeenCalledWith(instanceId, branding, userId);
    expect(mockThemeService.loadTheme).toHaveBeenCalledWith(instanceId);
    expect(result.current.error).toBeNull();
  });

  it('should handle update branding errors', async () => {
    const mockResult = {
      success: false,
      errors: ['Update failed']
    };
    mockBrandingService.updateBranding.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    await act(async () => {
      await result.current.updateBranding({}, userId);
    });

    expect(result.current.error).toBe('Update failed');
  });

  it('should upload logo successfully', async () => {
    const mockResult = {
      success: true,
      url: 'https://example.com/logo.png'
    };
    mockBrandingService.uploadLogo.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await act(async () => {
      const uploadResult = await result.current.uploadLogo(file, userId);
      expect(uploadResult).toEqual(mockResult);
    });

    expect(mockBrandingService.uploadLogo).toHaveBeenCalledWith(instanceId, file, userId);
    expect(mockThemeService.loadTheme).toHaveBeenCalledWith(instanceId);
  });

  it('should handle upload logo errors', async () => {
    const mockResult = {
      success: false,
      error: 'Upload failed'
    };
    mockBrandingService.uploadLogo.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await act(async () => {
      await result.current.uploadLogo(file, userId);
    });

    expect(result.current.error).toBe('Upload failed');
  });

  it('should upload favicon successfully', async () => {
    const mockResult = {
      success: true,
      url: 'https://example.com/favicon.ico'
    };
    mockBrandingService.uploadFavicon.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    const file = new File(['favicon'], 'favicon.ico', { type: 'image/x-icon' });

    await act(async () => {
      const uploadResult = await result.current.uploadFavicon(file, userId);
      expect(uploadResult).toEqual(mockResult);
    });

    expect(mockBrandingService.uploadFavicon).toHaveBeenCalledWith(instanceId, file, userId);
  });

  it('should reset to defaults successfully', async () => {
    const mockResult = {
      success: true,
      branding: mockBranding
    };
    mockBrandingService.resetToDefaults.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    await act(async () => {
      const resetResult = await result.current.resetToDefaults(userId);
      expect(resetResult).toEqual(mockResult);
    });

    expect(mockBrandingService.resetToDefaults).toHaveBeenCalledWith(instanceId, userId);
    expect(mockThemeService.loadTheme).toHaveBeenCalledWith(instanceId);
  });

  it('should handle service exceptions', async () => {
    const error = new Error('Service error');
    mockBrandingService.updateBranding.mockRejectedValue(error);

    const { result } = renderHook(() => useBrandingAdmin(instanceId));

    await act(async () => {
      const updateResult = await result.current.updateBranding({}, userId);
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors).toContain('Service error');
    });

    expect(result.current.error).toBe('Service error');
  });
});