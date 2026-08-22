import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2;
  currentLocale: Locale;
  onStepClick?: (step: 1 | 2) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  currentLocale,
  onStepClick
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  return (
    <div className="step-indicator-wrapper" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={2}>
      <div className="step-indicator">
        {/* Step 1 Node */}
        <div
          className={`step-node ${currentStep === 1 ? 'active' : 'completed'}`}
          onClick={() => currentStep === 2 && onStepClick && onStepClick(1)}
          style={{ cursor: currentStep === 2 ? 'pointer' : 'default' }}
        >
          <div className="step-circle">
            {currentStep > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
          </div>
          <span>{t('booking.step1_node')}</span>
        </div>

        {/* Connecting Line */}
        <div className={`step-line ${currentStep >= 2 ? 'filled' : ''}`} />

        {/* Step 2 Node */}
        <div className={`step-node ${currentStep === 2 ? 'active' : ''}`}>
          <div className="step-circle">
            2
          </div>
          <span>{t('booking.step2_node')}</span>
        </div>
      </div>
    </div>
  );
};
