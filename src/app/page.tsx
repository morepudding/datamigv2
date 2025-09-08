'use client';

import { useState } from 'react';

// Imports des composants
import FileUploader from '@/components/FileUploader';
import ProcessingStatusComponent from '@/components/ProcessingStatus';
import ResultsDownload from '@/components/ResultsDownload';
import StepProgress from '@/components/StepProgress';

// Imports des types
import type { 
  ProcessingStatus, 
  ProcessingResult, 
  ArchiveResult, 
  ProcessingMetrics,
  ValidationWarning,
  ProcessingStep,
  LogEntry
} from '@/lib/types';

export default function HomePage() {
  // État principal de l'application
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [archiveResult, setArchiveResult] = useState<ArchiveResult | undefined>();
  const [metrics, setMetrics] = useState<ProcessingMetrics | undefined>();
  const [error, setError] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('XXXXX');
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);

  // État pour les étapes et logs
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setStatus('idle');
    setProcessingResults([]);
    setArchiveResult(undefined);
    setMetrics(undefined);
    setValidationWarnings([]);
    setProcessingSteps([]);
    setLogs([]);
  };

  const initializeProcessingSteps = () => {
    const steps: ProcessingStep[] = [
      {
        id: 'validation',
        name: 'Validation des données',
        description: 'Vérification de la structure et du contenu du fichier Excel',
        status: 'idle'
      },
      {
        id: 'master-part',
        name: 'Master Part',
        description: 'Référentiel principal des pièces manufacturées',
        status: 'idle'
      },
      {
        id: 'master-part-all',
        name: 'Master Part ALL',
        description: 'Référentiel complet incluant les pièces d\'achat',
        status: 'idle'
      },
      {
        id: 'technical-specs',
        name: 'Technical Spec Values',
        description: 'Spécifications techniques et attributs',
        status: 'idle'
      },
      {
        id: 'eng-structure',
        name: 'Eng Part Structure',
        description: 'Structure de nomenclature parent-enfant',
        status: 'idle'
      },
      {
        id: 'inventory-part',
        name: 'Inventory Part',
        description: 'Configuration de gestion des stocks',
        status: 'idle'
      },
      {
        id: 'inventory-plan',
        name: 'Inventory Part Plan',
        description: 'Paramètres de planification des stocks',
        status: 'idle'
      },
      {
        id: 'archive',
        name: 'Génération archive',
        description: 'Création de l\'archive ZIP finale',
        status: 'idle'
      }
    ];
    setProcessingSteps(steps);
    return steps;
  };

  const updateStepStatus = (stepId: string, newStatus: ProcessingStatus, processedRows?: number, duration?: number) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: newStatus, processedRows, duration }
        : step
    ));
  };

  const addLog = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, module?: string) => {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      module
    };
    setLogs(prev => [...prev, logEntry]);
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    setStatus('processing');
    setError('');
    const steps = initializeProcessingSteps();
    addLog('INFO', 'Début du traitement de migration PLM vers IFS', 'system');

    try {
      // Préparer les données pour l'upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Étape 1: Validation
      setCurrentStep('validation');
      updateStepStatus('validation', 'processing');
      addLog('INFO', 'Validation des données en cours...', 'validation');

      // Appel API
      const response = await fetch('/api/migration', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du traitement');
      }

      // Simulation de la progression des étapes
      const moduleSteps = ['master-part', 'master-part-all', 'technical-specs', 'eng-structure', 'inventory-part', 'inventory-plan'];
      
      updateStepStatus('validation', 'completed');
      addLog('INFO', 'Validation terminée avec succès', 'validation');

      // Simuler le traitement de chaque module
      for (let i = 0; i < moduleSteps.length; i++) {
        const stepId = moduleSteps[i];
        setCurrentStep(stepId);
        updateStepStatus(stepId, 'processing');
        addLog('INFO', `Traitement du module ${stepId}...`, stepId);
        
        // Simulation d'un délai
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const moduleResult = result.processingResults.find((r: ProcessingResult) => r.module === stepId);
        if (moduleResult) {
          updateStepStatus(stepId, 'completed', moduleResult.rowsOutput, moduleResult.processingTime);
          addLog('INFO', `Module ${stepId} terminé: ${moduleResult.rowsOutput} lignes`, stepId);
        }
      }

      // Étape finale: archive
      setCurrentStep('archive');
      updateStepStatus('archive', 'processing');
      addLog('INFO', 'Création de l\'archive ZIP...', 'archive');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStepStatus('archive', 'completed');
      addLog('INFO', 'Archive créée avec succès', 'archive');

      // Mise à jour des résultats
      setProcessingResults(result.processingResults);
      setArchiveResult(result.archiveResult);
      setMetrics(result.metrics);
      setProjectCode(result.projectCode);
      setValidationWarnings(result.validationWarnings || []);
      setStatus('completed');
      setCurrentStep('');

      // Réinitialiser tous les états d'étapes pour arrêter les animations
      setProcessingSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          status: step.status === 'processing' ? 'completed' : step.status
        }))
      );

      addLog('INFO', `Traitement terminé avec succès - Code projet: ${result.projectCode}`, 'system');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      setStatus('error');
      setCurrentStep('');
      
      // Marquer l'étape courante comme erreur ET arrêter toutes les animations
      if (currentStep) {
        updateStepStatus(currentStep, 'error');
      }
      
      // Arrêter toutes les animations en cours
      setProcessingSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          status: step.status === 'processing' ? 'error' : step.status
        }))
      );
      
      addLog('ERROR', `Erreur fatale: ${errorMessage}`, 'system');
    }
  };

  const resetProcess = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProcessingResults([]);
    setArchiveResult(undefined);
    setMetrics(undefined);
    setError('');
    setValidationWarnings([]);
    setProcessingSteps([]);
    setCurrentStep('');
    setLogs([]);
    setProjectCode('XXXXX');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header avec gradient moderne */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo/Icône */}
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Migration PLM vers IFS
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Transformation de données Product Lifecycle Management vers le système IFS
                </p>
              </div>
            </div>
            {status !== 'idle' && (
              <button
                onClick={resetProcess}
                className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Nouveau traitement
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Section d'upload de fichier avec animation */}
          {status === 'idle' && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-500 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Sélectionner le fichier PLM (Excel ou CSV)
                </h2>
              </div>
              <FileUploader
                onFileSelect={handleFileSelect}
                acceptedTypes={['.xlsx', '.csv']}
                maxSize={50 * 1024 * 1024}
              />
              
              {selectedFile && (
                <div className="mt-6 flex justify-end animate-fade-in-up">
                  <button
                    onClick={handleStartProcessing}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-transparent text-base font-medium rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Démarrer la migration
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Avertissements de validation avec meilleur design */}
          {validationWarnings.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-lg animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                    <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    Avertissements de validation détectés
                  </h3>
                  <div className="text-sm text-amber-700">
                    <ul className="space-y-2">
                      {validationWarnings.map((warning, index) => (
                        <li key={index} className="flex items-start">
                          <div className="flex-shrink-0 w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3"></div>
                          <span>
                            {warning.message}
                            {warning.rowIndex !== undefined && (
                              <span className="ml-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-medium">
                                Ligne {warning.rowIndex + 1}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section de traitement */}
          {(status === 'processing' || status === 'completed' || status === 'error') && (
            <div className="space-y-6">
              <ProcessingStatusComponent
                status={status}
                currentStep={currentStep}
                metrics={metrics}
                steps={processingSteps}
                logs={logs}
                error={error}
              />
              
              {/* Résultats de téléchargement */}
              <ResultsDownload
                archiveResult={archiveResult}
                processingResults={processingResults}
                projectCode={projectCode}
                isVisible={status === 'completed'}
              />
            </div>
          )}

          {/* Section d'aide avec design moderne */}
          {status === 'idle' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                    <span>À propos de cette application</span>
                    <div className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">
                      v2.0
                    </div>
                  </h3>
                  <div className="text-sm text-blue-700 space-y-3">
                    <p>
                      Cette application transforme les données PLM (Product Lifecycle Management) 
                      au format Excel (.xlsx) ou CSV (.csv) vers <strong>5 fichiers CSV</strong> compatibles avec le système IFS.
                    </p>
                    <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
                      <p className="font-semibold mb-2 text-blue-800">Modules de traitement :</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                          Master Part
                        </div>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></div>
                          Eng Part Structure
                        </div>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                          Technical Spec Values
                        </div>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
                          Inventory Part
                        </div>
                        <div className="flex items-center text-xs col-span-1 sm:col-span-2">
                          <div className="w-2 h-2 bg-rose-400 rounded-full mr-2"></div>
                          Inventory Part Plan
                        </div>
                      </div>
                    </div>
                    <p className="text-xs bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <strong>Formats acceptés :</strong> Fichier Excel (.xlsx) ou CSV (.csv) avec colonnes : 
                      Number, Name, Classification, Source, State, Version, Context, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
