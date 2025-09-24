'use client';

import { useState } from 'react';
import { SetupRequest } from '@/types/funifier';
import { SetupMode } from '@/types/white-label';
import { SetupModeSelection } from './SetupModeSelection';
import { FunifierCredentialsForm } from './FunifierCredentialsForm';
import { SetupProgress } from './SetupProgress';
import { SetupComplete } from './SetupComplete';

export interface SetupWizardProps {
  onComplete: (result: { success: boolean; instanceId?: string; redirectUrl?: string; errors?: string[] }) => void;
  onSetupRequest: (request: SetupRequest) => Promise<{ success: boolean; instanceId?: string; redirectUrl?: string; errors?: string[] }>;
}

type SetupStep = 'mode' | 'credentials' | 'processing' | 'complete';

export function SetupWizard({ onComplete, onSetupRequest }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('mode');
  const [selectedMode, setSelectedMode] = useState<SetupMode | null>(null);
  const [setupResult, setSetupResult] = useState<{
    success: boolean;
    instanceId?: string;
    redirectUrl?: string;
    errors?: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleModeSelection = (mode: SetupMode) => {
    setSelectedMode(mode);
    
    if (mode === 'demo') {
      // For demo mode, proceed directly to processing
      handleSetupSubmit({ mode });
    } else {
      // For Funifier mode, go to credentials form
      setCurrentStep('credentials');
    }
  };

  const handleCredentialsSubmit = (credentials: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  }) => {
    if (!selectedMode) return;
    
    handleSetupSubmit({
      mode: selectedMode,
      funifierCredentials: credentials
    });
  };

  const handleSetupSubmit = async (request: SetupRequest) => {
    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      const result = await onSetupRequest(request);
      setSetupResult(result);
      setCurrentStep('complete');
      
      // Auto-redirect after 3 seconds if successful
      if (result.success && result.redirectUrl) {
        setTimeout(() => {
          onComplete(result);
        }, 3000);
      }
    } catch (error) {
      setSetupResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Setup failed']
      });
      setCurrentStep('complete');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCurrentStep('mode');
    setSelectedMode(null);
    setSetupResult(null);
    setIsProcessing(false);
  };

  const handleContinue = () => {
    if (setupResult) {
      onComplete(setupResult);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to Your Gamification Platform</h1>
          <p className="text-blue-100">Let&apos;s get you set up in just a few steps</p>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center ${currentStep === 'mode' ? 'text-blue-600 font-medium' : currentStep === 'credentials' || currentStep === 'processing' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep === 'mode' ? 'bg-blue-600 text-white' : currentStep === 'credentials' || currentStep === 'processing' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              Choose Mode
            </div>
            <div className={`flex items-center ${currentStep === 'credentials' ? 'text-blue-600 font-medium' : currentStep === 'processing' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep === 'credentials' ? 'bg-blue-600 text-white' : currentStep === 'processing' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              Configuration
            </div>
            <div className={`flex items-center ${currentStep === 'complete' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              Complete
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'mode' && (
            <SetupModeSelection
              onModeSelect={handleModeSelection}
              selectedMode={selectedMode}
            />
          )}

          {currentStep === 'credentials' && selectedMode === 'funifier' && (
            <FunifierCredentialsForm
              onSubmit={handleCredentialsSubmit}
              onBack={() => setCurrentStep('mode')}
              isLoading={isProcessing}
            />
          )}

          {currentStep === 'processing' && (
            <SetupProgress mode={selectedMode || 'demo'} />
          )}

          {currentStep === 'complete' && setupResult && (
            <SetupComplete
              result={setupResult}
              onRetry={handleRetry}
              onContinue={handleContinue}
            />
          )}
        </div>
      </div>
    </div>
  );
}