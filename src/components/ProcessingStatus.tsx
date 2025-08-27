'use client';

import React from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { ProcessingStatus, ProcessingMetrics, ProcessingStep, LogEntry } from '@/lib/types';

interface ProcessingStatusProps {
  status: ProcessingStatus;
  currentStep?: string;
  metrics?: ProcessingMetrics;
  steps?: ProcessingStep[];
  logs?: LogEntry[];
  error?: string;
}

export default function ProcessingStatusComponent({
  status,
  currentStep,
  metrics,
  steps = [],
  logs = [],
  error
}: ProcessingStatusProps) {
  const getStatusColor = (stepStatus: ProcessingStatus) => {
    switch (stepStatus) {
      case 'idle': return 'text-gray-500 bg-gray-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusIcon = (stepStatus: ProcessingStatus) => {
    switch (stepStatus) {
      case 'idle':
        return <ClockIcon className="h-5 w-5" />;
      case 'processing':
        return (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  const calculateProgress = () => {
    if (status === 'idle') return 0;
    if (status === 'completed') return 100;
    if (status === 'error') return 0;
    
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    
    return Math.round((completedSteps / totalSteps) * 100);
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

  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-600';
      case 'WARN': return 'text-yellow-600';
      case 'INFO': return 'text-blue-600';
      case 'DEBUG': return 'text-gray-500';
      default: return 'text-gray-700';
    }
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* En-tête avec statut global */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Traitement des données</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            <span className="ml-2 capitalize">{status === 'processing' ? 'En cours' : status === 'completed' ? 'Terminé' : status === 'error' ? 'Erreur' : 'En attente'}</span>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progression globale</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                status === 'error' ? 'bg-red-500' : status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Métriques rapides */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Lignes traitées</p>
              <p className="font-medium text-gray-900">{formatNumber(metrics.totalRows)}</p>
            </div>
            <div>
              <p className="text-gray-500">Avertissements</p>
              <p className="font-medium text-yellow-600">{formatNumber(metrics.warningCount)}</p>
            </div>
            <div>
              <p className="text-gray-500">Erreurs</p>
              <p className="font-medium text-red-600">{formatNumber(metrics.errorCount)}</p>
            </div>
            <div>
              <p className="text-gray-500">Durée</p>
              <p className="font-medium text-gray-900">
                {metrics.duration ? formatDuration(metrics.duration) : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Étapes de traitement */}
      {steps.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Étapes de traitement</h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  step.status === 'processing' ? 'bg-blue-50 border-blue-200' : 
                  step.status === 'completed' ? 'bg-green-50 border-green-200' :
                  step.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 ${getStatusColor(step.status)}`}>
                    {getStatusIcon(step.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{step.name}</p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-600">
                  {step.processedRows !== undefined && (
                    <p>{formatNumber(step.processedRows)} lignes</p>
                  )}
                  {step.duration && (
                    <p>{formatDuration(step.duration)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message d'erreur détaillé */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Erreur de traitement</h4>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs détaillés */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Logs de traitement</h4>
          <div className="bg-gray-50 rounded border p-4 max-h-64 overflow-y-auto">
            <div className="space-y-1 text-sm font-mono">
              {logs.slice(-50).map((log, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                  <span className={`text-xs font-semibold uppercase ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-700">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
          {logs.length > 50 && (
            <p className="text-xs text-gray-500 mt-2">
              Affichage des 50 derniers logs sur {logs.length} total
            </p>
          )}
        </div>
      )}

      {/* Statistiques détaillées par module */}
      {metrics?.moduleStats && Object.keys(metrics.moduleStats).length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Statistiques par module</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.moduleStats).map(([moduleName, stats]) => (
              <div key={moduleName} className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">{moduleName}</h5>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Entrée :</dt>
                    <dd className="font-medium">{formatNumber(stats.inputRows)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Sortie :</dt>
                    <dd className="font-medium">{formatNumber(stats.outputRows)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Filtrées :</dt>
                    <dd className="font-medium text-red-600">{formatNumber(stats.filteredRows)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Durée :</dt>
                    <dd className="font-medium">{formatDuration(stats.duration)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
