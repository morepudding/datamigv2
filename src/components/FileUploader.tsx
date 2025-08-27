'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  disabled?: boolean;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export default function FileUploader({
  onFileSelect,
  acceptedTypes = ['.xlsx'],
  maxSize = 50 * 1024 * 1024, // 50MB par défaut
  disabled = false
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError('');
    
    // Gestion des erreurs de rejet
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setError(`Le fichier est trop volumineux. Taille maximum : ${Math.round(maxSize / (1024 * 1024))} MB`);
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError(`Type de fichier non supporté. Types acceptés : ${acceptedTypes.join(', ')}`);
      } else {
        setError('Erreur lors de la sélection du fichier');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validation supplémentaire du type MIME
      if (!file.type.includes('spreadsheet') && !file.name.toLowerCase().endsWith('.xlsx')) {
        setError('Seuls les fichiers Excel (.xlsx) sont acceptés');
        return;
      }

      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };

      setSelectedFile(fileInfo);
      onFileSelect(file);
    }
  }, [maxSize, acceptedTypes, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize,
    multiple: false,
    disabled: disabled || isUploading
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDropzoneClasses = () => {
    let baseClasses = "relative w-full p-8 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer group";
    
    if (disabled || isUploading) {
      baseClasses += " bg-slate-50 border-slate-200 cursor-not-allowed";
    } else if (isDragReject || error) {
      baseClasses += " border-red-300 bg-red-50 animate-pulse-glow";
    } else if (isDragAccept) {
      baseClasses += " border-emerald-400 bg-emerald-50 shadow-lg scale-102 animate-pulse-glow";
    } else if (isDragActive) {
      baseClasses += " border-blue-400 bg-blue-50 shadow-lg scale-102";
    } else {
      baseClasses += " border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-lg hover:scale-102 group-hover:border-blue-400";
    }
    
    return baseClasses;
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError('');
  };

  return (
    <div className="w-full space-y-4">
      <div {...getRootProps()} className={getDropzoneClasses()}>
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center text-center">
          {/* Icône principale avec animations */}
          <div className="mb-6 transition-transform duration-300 group-hover:scale-110">
            {error ? (
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full animate-pulse">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            ) : selectedFile ? (
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full animate-fade-in">
                <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
              </div>
            ) : (
              <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
                isDragActive 
                  ? 'bg-blue-100 text-blue-500 scale-110' 
                  : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500'
              }`}>
                <DocumentArrowUpIcon className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Texte principal avec meilleure typographie */}
          <div className="space-y-3">
            {error ? (
              <div className="animate-fade-in">
                <p className="text-red-600 font-semibold text-lg">{error}</p>
                <p className="text-red-500 text-sm mt-1">Veuillez sélectionner un autre fichier</p>
              </div>
            ) : selectedFile ? (
              <div className="animate-fade-in">
                <p className="text-emerald-600 font-semibold text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fichier sélectionné
                </p>
                <p className="text-slate-600 text-sm">Prêt pour le traitement</p>
              </div>
            ) : isDragActive ? (
              <div className="animate-pulse">
                <p className="text-blue-600 font-semibold text-lg">✨ Déposez le fichier Excel ici...</p>
                <p className="text-blue-500 text-sm">Nous nous occuperons du reste !</p>
              </div>
            ) : (
              <div className="group-hover:animate-fade-in-up">
                <p className="text-slate-700 font-semibold text-lg">
                  📁 Glissez-déposez un fichier Excel ici
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  ou <span className="text-blue-600 font-medium">cliquez pour parcourir</span>
                </p>
                <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-slate-400">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>
                    {acceptedTypes.join(', ')}
                  </div>
                  <div className="w-px h-4 bg-slate-300"></div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>
                    Max {Math.round(maxSize / (1024 * 1024))} MB
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Indicateur de chargement amélioré */}
          {isUploading && (
            <div className="mt-6 animate-fade-in">
              <div className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-blue-700 bg-blue-100 animate-pulse">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ⚡ Traitement en cours...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informations détaillées du fichier sélectionné avec design moderne */}
      {selectedFile && !error && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-6 border border-slate-200 shadow-lg animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-slate-900 text-lg">Fichier sélectionné</h4>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/70 rounded-lg p-3 border border-slate-200/50">
                  <dt className="font-medium text-slate-500 text-sm mb-1">📄 Nom du fichier</dt>
                  <dd className="text-slate-900 text-sm font-medium break-all">{selectedFile.name}</dd>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-slate-200/50">
                  <dt className="font-medium text-slate-500 text-sm mb-1">📏 Taille</dt>
                  <dd className="text-slate-900 text-sm font-medium">{formatFileSize(selectedFile.size)}</dd>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-slate-200/50">
                  <dt className="font-medium text-slate-500 text-sm mb-1">📋 Type</dt>
                  <dd className="text-slate-900 text-sm font-medium flex items-center">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-semibold">
                      Excel (.xlsx)
                    </span>
                  </dd>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-slate-200/50">
                  <dt className="font-medium text-slate-500 text-sm mb-1">🕒 Modifié le</dt>
                  <dd className="text-slate-900 text-sm font-medium">{formatDate(selectedFile.lastModified)}</dd>
                </div>
              </dl>
            </div>
            <button
              onClick={clearSelection}
              className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200 group"
              title="Supprimer la sélection"
            >
              <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Instructions d'utilisation avec design moderne */}
      {!selectedFile && !error && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm animate-fade-in">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                💡 Instructions d'utilisation
              </h5>
              <div className="text-sm text-blue-700 space-y-2">
                <p>
                  Sélectionnez un <strong>fichier Excel (.xlsx)</strong> contenant les données PLM à migrer vers IFS.
                </p>
                <div className="bg-white/50 rounded-lg p-3 border border-blue-200/50">
                  <p className="font-medium text-blue-800 mb-1">📋 Colonnes requises :</p>
                  <div className="text-xs text-blue-600 grid grid-cols-2 gap-1">
                    <span>• Number, Name</span>
                    <span>• Classification, Source</span>
                    <span>• State, Version</span>
                    <span>• Context, Site IFS</span>
                  </div>
                </div>
                <p className="text-xs font-medium">
                  ⚡ Le traitement générera automatiquement 5 fichiers CSV compatibles IFS.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
