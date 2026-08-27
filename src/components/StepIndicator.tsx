import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  currentLocale: Locale;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  currentLocale,
  onStepClick
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const renderNode = (step: 1 | 2 | 3, labelKey: string) => {
    const isCompleted = currentStep > step;
    const isActive = currentStep === step;
    const clickable = isCompleted && !!onStepClick;

    return (
      <div
        className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
        onClick={() => clickable && onStepClick && onStepClick(step)}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
      >
        <div className="step-circle">
          {isCompleted ? <Check size={14} strokeWidth={3} /> : step}
        </div>
        <span>{t(labelKey)}</span>
      </div>
    );
  };

  return (
    <div className="step-indicator-wrapper" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
      <div className="step-indicator">
        {renderNode(1, 'booking.step1_node')}
        <div className={`step-line ${currentStep >= 2 ? 'filled' : ''}`} />
        {renderNode(2, 'booking.step2_node')}
        <div className={`step-line ${currentStep >= 3 ? 'filled' : ''}`} />
        {renderNode(3, 'booking.step3_node')}
      </div>
    </div>
  );
};
