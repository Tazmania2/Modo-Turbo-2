'use client';

import React, { useState, useRef } from 'react';
import { WhiteLabelBranding } from '@/types/funifier';
import { useTheme, useBrandingAdmin } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Upload, RotateCcw, Palette, Building, Image } from 'lucide-react';

interface BrandingPanelProps {
  instanceId: string;
  userId: string;
}

export function BrandingPanel({ instanceId, userId }: BrandingPanelProps) {
  const { branding, isLoading: themeLoading } = useTheme();
  const { isLoading, error, updateBranding, uploadLogo, uploadFavicon, resetToDefaults } = useBrandingAdmin(instanceId);
  
  const [formData, setFormData] = useState<Partial<WhiteLabelBranding>>({
    primaryColor: branding?.primaryColor || '#3B82F6',
    secondaryColor: branding?.secondaryColor || '#1F2937',
    accentColor: branding?.accentColor || '#10B981',
    companyName: branding?.companyName || '',
    tagline: branding?.tagline || ''
  });
  
  const [previewColors, setPreviewColors] = useState({
    primary: formData.primaryColor || '#3B82F6',
    secondary: formData.secondaryColor || '#1F2937',
    accent: formData.accentColor || '#10B981'
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Update form data when branding changes
  React.useEffect(() => {
    if (branding) {
      setFormData({
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        companyName: branding.companyName,
        tagline: branding.tagline
      });
      setPreviewColors({
        primary: branding.primaryColor,
        secondary: branding.secondaryColor,
        accent: branding.accentColor
      });
    }
  }, [branding]);

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    setFormData(prev => ({ ...prev, [`${colorType}Color`]: value }));
    setPreviewColors(prev => ({ ...prev, [colorType]: value }));
  };

  const handleInputChange = (field: keyof WhiteLabelBranding, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveColors = async () => {
    await updateBranding({
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor
    }, userId);
  };

  const handleSaveCompanyInfo = async () => {
    await updateBranding({
      companyName: formData.companyName,
      tagline: formData.tagline
    }, userId);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadLogo(file, userId);
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFavicon(file, userId);
    }
  };

  const handleReset = async () => {
    if (confirm(`Are you sure you want to reset all branding to defaults? This action cannot be undone.`)) {
      await resetToDefaults(userId);
    }
  };

  if (themeLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading branding configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Branding Configuration</h2>
          <p className="text-muted-foreground">
            Customize your platform&apos;s appearance and branding
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>
                Configure your platform&apos;s color palette. Changes are previewed in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('primary', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('primary', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-8 rounded border"
                    style={{ backgroundColor: previewColors.primary }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('secondary', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('secondary', e.target.value)}
                      placeholder="#1F2937"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-8 rounded border"
                    style={{ backgroundColor: previewColors.secondary }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={formData.accentColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('accent', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={formData.accentColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange('accent', e.target.value)}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-8 rounded border"
                    style={{ backgroundColor: previewColors.accent }}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveColors}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Colors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Configure your company name and tagline that appear throughout the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('tagline', e.target.value)}
                  placeholder="Your company tagline"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveCompanyInfo}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Company Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Upload your company logo. Recommended size: 200x60px, PNG or SVG format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {branding?.logo && (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-muted">
                    <img
                      src={branding.logo}
                      alt="Current logo"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                )}
                
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {branding?.logo ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Favicon</CardTitle>
                <CardDescription>
                  Upload your favicon. Recommended size: 32x32px, ICO or PNG format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {branding?.favicon && (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-muted">
                    <img
                      src={branding.favicon}
                      alt="Current favicon"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                )}
                
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/x-icon,image/png"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {branding?.favicon ? 'Change Favicon' : 'Upload Favicon'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}