'use client';

import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { ProcessingStep } from '@/lib/types';

interface StepProgressProps {
  steps: ProcessingStep[];
  currentStepId?: string;
  className?: string;
}

export default function StepProgress({ steps, currentStepId, className = '' }: StepProgressProps) {
  const getStepIcon = (step: ProcessingStep, isActive: boolean, index: number) => {
    if (step.status === 'completed') {
      return (
        <CheckCircleIcon className="h-6 w-6 text-green-500" />
      );
    } else if (step.status === 'error') {
      return (
        <XCircleIcon className="h-6 w-6 text-red-500" />
      );
    } else if (step.status === 'processing' || (isActive && currentStepId)) {
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 bg-white">
          <span className="text-xs font-medium text-gray-500">{index + 1}</span>
        </div>
      );
    }
  };

  const getStepColor = (step: ProcessingStep, isActive: boolean) => {
    if (step.status === 'completed') {
      return 'text-green-700 bg-green-50 border-green-200';
    } else if (step.status === 'error') {
      return 'text-red-700 bg-red-50 border-red-200';
    } else if (step.status === 'processing' || isActive) {
      return 'text-blue-700 bg-blue-50 border-blue-200';
    } else {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index >= steps.length - 1) return '';
    
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    
    if (currentStep.status === 'completed') {
      return 'bg-green-300';
    } else if (currentStep.status === 'processing') {
      return 'bg-blue-300';
    } else if (currentStep.status === 'error') {
      return 'bg-red-300';
    } else {
      return 'bg-gray-300';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex flex-col space-y-4">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const stepColor = getStepColor(step, isActive);
          
          return (
            <div key={step.id} className="relative">
              {/* Connecteur vers l'étape suivante */}
              {index < steps.length - 1 && (
                <div className="absolute left-3 top-12 w-0.5 h-8 -translate-x-0.5">
                  <div className={`w-full h-full ${getConnectorColor(index)}`}></div>
                </div>
              )}
              
              {/* Contenu de l'étape */}
              <div className={`flex items-start space-x-4 p-4 rounded-lg border ${stepColor}`}>
                {/* Icône de statut */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step, isActive, index)}
                </div>
                
                {/* Informations de l'étape */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      {step.name}
                    </h4>
                    
                    {/* Badge de statut */}
                    <div className="flex items-center space-x-2 text-xs">
                      {step.processedRows !== undefined && (
                        <span className="px-2 py-1 bg-white bg-opacity-50 rounded">
                          {formatNumber(step.processedRows)} lignes
                        </span>
                      )}
                      {step.duration !== undefined && (
                        <span className="px-2 py-1 bg-white bg-opacity-50 rounded">
                          {formatDuration(step.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm mt-1 opacity-90">
                    {step.description}
                  </p>
                  
                  {/* Indicateur de progression pour l'étape active */}
                  {isActive && step.status === 'processing' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Traitement en cours...</span>
                        {step.processedRows !== undefined && (
                          <span>{formatNumber(step.processedRows)} lignes traitées</span>
                        )}
                      </div>
                      <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ 
                          width: step.processedRows ? `${Math.min((step.processedRows / 10000) * 100, 90)}%` : '20%',
                          transition: 'width 0.5s ease-in-out'
                        }}></div>
                      </div>
                    </div>
                  )}

                  {/* Message de complétion */}
                  {step.status === 'completed' && step.processedRows !== undefined && (
                    <div className="mt-2 text-xs text-green-600">
                      ✅ Terminé - {formatNumber(step.processedRows)} lignes traitées
                    </div>
                  )}

                  {/* Message d'erreur */}
                  {step.status === 'error' && (
                    <div className="mt-2 text-xs text-red-600">
                      ❌ Erreur lors du traitement
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
