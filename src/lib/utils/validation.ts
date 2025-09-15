// Utilitaires de validation pour le système de migration
import { InputRow, ValidationResult, ValidationError, ValidationWarning, ProcessingResult } from '../types/migration';

/**
 * Valide les données d'entrée selon les règles métier
 */
export function validateInputData(data: InputRow[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!data || data.length === 0) {
    errors.push({
      type: 'MISSING_COLUMN',
      message: 'No data found in input file'
    });
    return { isValid: false, errors, warnings };
  }

  // Validation ligne par ligne
  data.forEach((row, index) => {
    // Validation du champ Number (obligatoire et unique)
    if (!row.Number || row.Number.toString().trim() === '') {
      errors.push({
        type: 'INVALID_VALUE',
        message: 'Number field is required',
        rowIndex: index,
        columnName: 'Number',
        value: row.Number
      });
    }

    // Validation du champ Classification
    if (!row.Classification || row.Classification.toString().length < 10) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Classification field should have at least 10 characters',
        rowIndex: index,
        columnName: 'Classification',
        value: row.Classification
      });
    }

    // Validation du champ Source
    const validSources = ['Buy', 'Make', 'buy', 'make', 'BUY', 'MAKE'];
    if (row.Source && !validSources.includes(row.Source.toString())) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Source field should be "Buy" or "Make"',
        rowIndex: index,
        columnName: 'Source',
        value: row.Source
      });
    }

    // Validation du champ State
    const validStates = ['Released', 'In Work', 'Under Review', 'Obsolete', 'released', 'in work', 'under review', 'obsolete'];
    const stateValue = row.State ? row.State.toString().trim() : '';
    if (stateValue && !validStates.includes(stateValue)) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `State field should be "Released", "In Work", "Under Review", or "Obsolete" - got "${stateValue}"`,
        rowIndex: index,
        columnName: 'State',
        value: row.State
      });
    } else if (stateValue && stateValue.toLowerCase() === 'obsolete') {
      // Info: Les pièces obsolètes seront automatiquement filtrées du traitement
      // Pas de warning car c'est le comportement attendu
    }

    // Validation du champ Version (doit être une lettre)
    if (row.Version && !/^[A-Z]$/i.test(row.Version.toString().trim())) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Version field should be a single letter (A-Z)',
        rowIndex: index,
        columnName: 'Version',
        value: row.Version
      });
    }

    // Validation du champ Context (pour extraction code projet)
    if (!row.Context || row.Context.toString().trim().length < 5) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Context field should have at least 5 characters for project code extraction',
        rowIndex: index,
        columnName: 'Context',
        value: row.Context
      });
    }

    // Validation Structure Level (doit être un nombre)
    if (row['Structure Level'] && !/^\d+$/.test(row['Structure Level'].toString().trim())) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Structure Level field should be a number',
        rowIndex: index,
        columnName: 'Structure Level',
        value: row['Structure Level']
      });
    }

    // Validation Quantity (doit être un nombre)
    if (row.Quantity && !/^\d*\.?\d+$/.test(row.Quantity.toString().trim())) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Quantity field should be a number',
        rowIndex: index,
        columnName: 'Quantity',
        value: row.Quantity
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide la cohérence entre les résultats de différents modules
 */
export function validateProcessingResults(results: ProcessingResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Vérifier que tous les modules obligatoires ont été exécutés
  const requiredModules = ['master-part', 'master-part-all', 'eng-structure', 'inventory-part', 'inventory-plan', 'technical-specs'];
  const processedModules = results.map(r => r.module);

  requiredModules.forEach(module => {
    if (!processedModules.includes(module)) {
      errors.push({
        type: 'DEPENDENCY_ERROR',
        message: `Required module "${module}" was not processed`
      });
    }
  });

  // Vérifier les dépendances entre modules
  const masterPartResult = results.find(r => r.module === 'master-part');
  const masterPartAllResult = results.find(r => r.module === 'master-part-all');
  const engStructureResult = results.find(r => r.module === 'eng-structure');
  const technicalSpecsResult = results.find(r => r.module === 'technical-specs');

  if (engStructureResult && !masterPartAllResult) {
    errors.push({
      type: 'DEPENDENCY_ERROR',
      message: 'Eng Structure module requires Master Part ALL module to be processed first'
    });
  }

  if (technicalSpecsResult && !masterPartResult) {
    errors.push({
      type: 'DEPENDENCY_ERROR',
      message: 'Technical Specs module requires Master Part module to be processed first'
    });
  }

  // Vérifier les taux de réussite
  results.forEach(result => {
    if (!result.success) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `Module "${result.module}" failed to process: ${result.errors.join(', ')}`
      });
    }

    // Avertir si très peu de lignes en sortie
    if (result.rowsInput > 0 && result.rowsOutput === 0) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `Module "${result.module}" processed ${result.rowsInput} input rows but produced no output`
      });
    } else if (result.rowsInput > 100 && result.rowsOutput < result.rowsInput * 0.1) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `Module "${result.module}" produced very few output rows (${result.rowsOutput}) compared to input (${result.rowsInput})`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide qu'un code projet est au format attendu
 */
export function validateProjectCode(code: string): boolean {
  return /^[A-Z0-9]{5}$/.test(code);
}

/**
 * Valide qu'une révision est au format attendu
 */
export function validateRevision(revision: string): boolean {
  return /^[A-Z]$/.test(revision);
}

/**
 * Valide qu'un numéro de pièce est au format attendu
 */
export function validatePartNumber(partNumber: string): boolean {
  return Boolean(partNumber && partNumber.trim().length > 0);
}

/**
 * Valide qu'une classification contient les patterns attendus
 */
export function validateClassification(classification: string, pattern: string = 'AN29'): boolean {
  if (!classification || classification.length < 10) {
    return false;
  }
  return classification.includes(pattern);
}

/**
 * Valide qu'un état de cycle de vie est valide
 */
export function validateState(state: string): boolean {
  const validStates = ['released', 'in work', 'under review'];
  return validStates.includes(state.toLowerCase().trim());
}

/**
 * Valide qu'une source d'approvisionnement est valide
 */
export function validateSource(source: string): boolean {
  const validSources = ['buy', 'make'];
  return validSources.includes(source.toLowerCase().trim());
}

/**
 * Nettoie et valide une valeur numérique
 */
export function validateAndCleanNumericValue(value: any): { isValid: boolean; cleanValue: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, cleanValue: '' };
  }

  let cleanValue = String(value).trim();
  
  // Supprimer les unités physiques
  cleanValue = cleanValue.replace(/m²|m|deg|kg/g, '').trim();
  
  // Supprimer les exposants mathématiques
  cleanValue = cleanValue.replace(/\*\*\d+/g, '').trim();

  // Vérifier que c'est un nombre valide
  const isValid = !isNaN(parseFloat(cleanValue)) && isFinite(parseFloat(cleanValue));
  
  return { isValid, cleanValue };
}

/**
 * Groupe les erreurs et avertissements similaires pour un affichage optimisé
 */

interface GroupedMessage {
  type: string;
  message: string;
  count: number;
  sampleRows: number[];
  columnName?: string;
}

function groupMessages(messages: (ValidationError | ValidationWarning)[]): GroupedMessage[] {
  const groups = new Map<string, GroupedMessage>();
  
  messages.forEach((msg) => {
    // Créer une clé unique basée sur le type et le message (sans numéro de ligne)
    let cleanMessage = msg.message;
    
    // Nettoyer le message des parties variables (numéros de ligne et valeurs spécifiques)
    cleanMessage = cleanMessage.replace(/Ligne \d+/g, '').trim();
    cleanMessage = cleanMessage.replace(/ - got "[^"]*"/g, ' - got "<valeur>"');
    cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim(); // Normaliser les espaces
    
    const key = `${msg.type}:${cleanMessage}:${msg.columnName || 'no-column'}`;
    
    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count++;
      if (msg.rowIndex !== undefined && group.sampleRows.length < 10) {
        group.sampleRows.push(msg.rowIndex + 1); // +1 pour affichage humain
      }
    } else {
      groups.set(key, {
        type: msg.type,
        message: cleanMessage,
        count: 1,
        sampleRows: msg.rowIndex !== undefined ? [msg.rowIndex + 1] : [],
        columnName: msg.columnName
      });
    }
  });
  
  // Trier par nombre d'occurrences (décroissant)
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/**
 * Groupe les messages similaires et retourne un résumé
 */
export function groupSimilarMessages(
  errors: ValidationError[], 
  warnings: ValidationWarning[]
): { 
  groupedErrors: GroupedMessage[], 
  groupedWarnings: GroupedMessage[],
  simplifiedErrors: Array<{type: string, message: string}>,
  simplifiedWarnings: Array<{type: string, message: string}>
} {
  const groupedErrors = groupMessages(errors);
  const groupedWarnings = groupMessages(warnings);

  // Convertir en format simple pour l'API
  const simplifiedErrors = groupedErrors.map(group => ({
    type: 'error',
    message: `[${group.type}] ${group.message}${group.count > 1 ? ` (${group.count} occurrences)` : ''}${group.columnName ? ` [${group.columnName}]` : ''}`
  }));

  const simplifiedWarnings = groupedWarnings.map(group => ({
    type: 'warning',
    message: `[${group.type}] ${group.message}${group.count > 1 ? ` (${group.count} occurrences)` : ''}${group.columnName ? ` [${group.columnName}]` : ''}`
  }));

  return {
    groupedErrors,
    groupedWarnings,
    simplifiedErrors,
    simplifiedWarnings
  };
}

/**
 * Génère un rapport de validation optimisé avec groupement des messages
 */
export function generateOptimizedValidationReport(validation: ValidationResult): string {
  let report = `Validation Report\n`;
  report += `================\n\n`;
  report += `Status: ${validation.isValid ? 'VALID' : 'INVALID'}\n`;
  report += `Errors: ${validation.errors.length}\n`;
  report += `Warnings: ${validation.warnings.length}\n\n`;

  const { groupedErrors, groupedWarnings } = groupSimilarMessages(validation.errors, validation.warnings);

  if (groupedErrors.length > 0) {
    report += `ERRORS (${groupedErrors.length} types):\n`;
    groupedErrors.forEach((group, index) => {
      report += `${index + 1}. [${group.type}] ${group.message}`;
      if (group.count > 1) {
        report += ` (${group.count} occurrences)`;
      }
      if (group.columnName) {
        report += ` [${group.columnName}]`;
      }
      if (group.sampleRows.length > 0) {
        const sampleText = group.sampleRows.length < group.count 
          ? `${group.sampleRows.slice(0, 5).join(', ')}...` 
          : group.sampleRows.join(', ');
        report += ` - Lignes: ${sampleText}`;
      }
      report += `\n`;
    });
    report += `\n`;
  }

  if (groupedWarnings.length > 0) {
    report += `WARNINGS (${groupedWarnings.length} types):\n`;
    groupedWarnings.forEach((group, index) => {
      report += `${index + 1}. [${group.type}] ${group.message}`;
      if (group.count > 1) {
        report += ` (${group.count} occurrences)`;
      }
      if (group.columnName) {
        report += ` [${group.columnName}]`;
      }
      if (group.sampleRows.length > 0) {
        const sampleText = group.sampleRows.length < group.count 
          ? `${group.sampleRows.slice(0, 5).join(', ')}...` 
          : group.sampleRows.join(', ');
        report += ` - Lignes: ${sampleText}`;
      }
      report += `\n`;
    });
  }

  return report;
}
