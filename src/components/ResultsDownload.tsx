'use client';

import React, { useState } from 'react';
import { 
  ArrowDownTrayIcon, 
  DocumentIcon, 
  ArchiveBoxIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import type { ArchiveResult, ProcessingResult } from '@/lib/types';

interface ResultsDownloadProps {
  archiveResult?: ArchiveResult;
  processingResults?: ProcessingResult[];
  projectCode?: string;
  isVisible?: boolean;
}

interface FileDownloadInfo {
  name: string;
  displayName: string;
  size: string;
  rows: number;
  status: 'success' | 'error' | 'warning';
  path: string;
}

export default function ResultsDownload({
  archiveResult,
  processingResults = [],
  projectCode = 'XXXXX',
  isVisible = false
}: ResultsDownloadProps) {
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getFileInfo = (): FileDownloadInfo[] => {
    const moduleDisplayNames: Record<string, string> = {
      'master-part': 'Master Part (Référentiel principal)',
      'master-part-all': 'Master Part ALL (Référentiel complet)',
      'eng-structure': 'Eng Part Structure (Structure nomenclature)',
      'inventory-part': 'Inventory Part (Gestion stocks)',
      'inventory-plan': 'Inventory Part Plan (Planification stocks)',
      'technical-specs': 'Technical Spec Values (Spécifications techniques)'
    };

    const finalFileNames: Record<string, string> = {
      'master-part': `01_L_PARTS_MD_004_${projectCode}_WOOD.csv`,
      'eng-structure': `02_L_ENG_PART_STRUCT_${projectCode}_WOOD.csv`,
      'technical-specs': `03_L_TECHNICAL_CLASS_VALUES_${projectCode}_WOOD.csv`,
      'inventory-part': `04_L_INVENTORY_PART_${projectCode}_WOOD.csv`,
      'inventory-plan': `05_L_INVENTORY_PART_PLAN_${projectCode}_WOOD.csv`
    };

    return processingResults.map(result => ({
      name: finalFileNames[result.module] || `${result.module}.csv`,
      displayName: moduleDisplayNames[result.module] || result.module,
      size: formatFileSize(result.rowsOutput * 150), // Estimation
      rows: result.rowsOutput,
      status: (result.errors.length > 0 ? 'error' : result.warnings.length > 0 ? 'warning' : 'success') as 'success' | 'error' | 'warning',
      path: result.outputPath
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleDownload = async (url: string, filename: string) => {
    setDownloadingFile(filename);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur de téléchargement');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleArchiveDownload = async () => {
    if (!archiveResult) return;
    
    setDownloadingFile(`Import_IFS_${projectCode}.zip`);
    
    // Utilisation directe de l'API archive (plus fiable sur Vercel)
    console.log('Création d\'archive à la demande...');
    try {
      const filePaths = processingResults
        .filter(r => r.success && r.outputPath)
        .map(r => r.outputPath);
        
      console.log(`Fichiers pour archive: ${filePaths.length} fichiers`);
      console.log(`Archive path: ${archiveResult.archivePath}`);
      
      // Essayer d'abord de télécharger l'archive déjà créée
      if (archiveResult.archivePath && archiveResult.success) {
        console.log('Tentative téléchargement archive existante...');
        const response = await fetch(`/api/migration/download?type=archive&path=${encodeURIComponent(archiveResult.archivePath)}`);
        if (response.ok) {
          console.log('Archive existante trouvée');
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Import_IFS_${projectCode}.zip`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          console.log('Téléchargement terminé');
          setDownloadingFile(null);
          return;
        }
      }
      
      // Fallback: créer une nouvelle archive
      console.log('Création nouvelle archive...');
      const response = await fetch('/api/migration/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths, projectCode })
      });
      
      if (response.ok) {
        console.log('Archive créée avec succès');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Import_IFS_${projectCode}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        console.log('Téléchargement terminé');
      } else {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Erreur téléchargement archive:', error);
      alert(`Impossible de télécharger l'archive: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    setDownloadingFile(null);
  };

  const handleFileDownload = async (fileInfo: FileDownloadInfo) => {
    await handleDownload(
      `/api/migration/download?type=csv&path=${encodeURIComponent(fileInfo.path)}`,
      fileInfo.name
    );
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const totalProcessingTime = processingResults.reduce((sum, result) => sum + result.processingTime, 0);
  const totalRows = processingResults.reduce((sum, result) => sum + result.rowsOutput, 0);
  const totalErrors = processingResults.reduce((sum, result) => sum + result.errors.length, 0);
  const totalWarnings = processingResults.reduce((sum, result) => sum + result.warnings.length, 0);

  const files = getFileInfo();

  if (!isVisible || processingResults.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Téléchargement de l'archive principale */}
      {archiveResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ArchiveBoxIcon className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-green-900">Archive IFS générée avec succès</h3>
                <p className="text-sm text-green-700 mt-1">
                  {archiveResult.filesIncluded.length} fichiers • {formatFileSize(archiveResult.archiveSize)}
                </p>
              </div>
            </div>
            <button
              onClick={handleArchiveDownload}
              disabled={downloadingFile === `Import_IFS_${projectCode}.zip`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingFile === `Import_IFS_${projectCode}.zip` ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Téléchargement...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Télécharger l'archive
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Statistiques récapitulatives */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Résumé du traitement</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{files.length}</p>
            <p className="text-sm text-blue-800">Fichiers générés</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{formatNumber(totalRows)}</p>
            <p className="text-sm text-green-800">Lignes exportées</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{formatNumber(totalWarnings)}</p>
            <p className="text-sm text-yellow-800">Avertissements</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{formatDuration(totalProcessingTime)}</p>
            <p className="text-sm text-gray-800">Durée totale</p>
          </div>
        </div>

        {totalErrors > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>{formatNumber(totalErrors)} erreur{totalErrors > 1 ? 's' : ''}</strong> détectée{totalErrors > 1 ? 's' : ''} pendant le traitement.
                  Vérifiez les détails ci-dessous.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des fichiers individuels */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fichiers générés</h3>
        <div className="space-y-3">
          {files.map((file, index) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <DocumentIcon className="h-6 w-6 text-gray-400 mr-2" />
                  {getStatusIcon(file.status)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.displayName}</p>
                  <p className="text-sm text-gray-500">
                    {file.name} • {formatNumber(file.rows)} lignes • {file.size}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleFileDownload(file)}
                disabled={downloadingFile === file.name}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingFile === file.name ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs">Téléchargement...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">Télécharger</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Détails des erreurs et avertissements */}
      {(totalErrors > 0 || totalWarnings > 0) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Détails des problèmes</h3>
          <div className="space-y-4">
            {processingResults.map((result, index) => {
              const hasIssues = result.errors.length > 0 || result.warnings.length > 0;
              if (!hasIssues) return null;

              return (
                <div key={result.module} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {files.find(f => f.path === result.outputPath)?.displayName || result.module}
                  </h4>
                  
                  {result.errors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-800 mb-2">Erreurs :</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {result.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.warnings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-2">Avertissements :</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                        {result.warnings.map((warning, warningIndex) => (
                          <li key={warningIndex}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions post-traitement */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Prochaines étapes</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Téléchargez l'archive ZIP</strong> qui contient tous les fichiers renommés selon la convention IFS</p>
              <p>• <strong>Vérifiez les données</strong> dans chaque fichier CSV avant l'import dans IFS</p>
              <p>• <strong>Traitez les avertissements</strong> si nécessaire pour optimiser la qualité des données</p>
              <p>• <strong>Importez les fichiers</strong> dans IFS selon l'ordre : Master Part → Structure → Technical Specs → Inventory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
