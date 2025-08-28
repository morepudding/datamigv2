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
    const validStates = ['Released', 'In Work', 'Under Review', 'released', 'in work', 'under review'];
    const stateValue = row.State ? row.State.toString().trim() : '';
    if (stateValue && !validStates.includes(stateValue)) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `State field should be "Released", "In Work", or "Under Review" - got "${stateValue}"`,
        rowIndex: index,
        columnName: 'State',
        value: row.State
      });
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
 * Génère un rapport de validation détaillé
 */
export function generateValidationReport(validation: ValidationResult): string {
  let report = `Validation Report\n`;
  report += `================\n\n`;
  report += `Status: ${validation.isValid ? 'VALID' : 'INVALID'}\n`;
  report += `Errors: ${validation.errors.length}\n`;
  report += `Warnings: ${validation.warnings.length}\n\n`;

  if (validation.errors.length > 0) {
    report += `ERRORS:\n`;
    validation.errors.forEach((error, index) => {
      report += `${index + 1}. [${error.type}] ${error.message}`;
      if (error.rowIndex !== undefined) {
        report += ` (Row: ${error.rowIndex + 1})`;
      }
      if (error.columnName) {
        report += ` (Column: ${error.columnName})`;
      }
      report += `\n`;
    });
    report += `\n`;
  }

  if (validation.warnings.length > 0) {
    report += `WARNINGS:\n`;
    validation.warnings.forEach((warning, index) => {
      report += `${index + 1}. [${warning.type}] ${warning.message}`;
      if (warning.rowIndex !== undefined) {
        report += ` (Row: ${warning.rowIndex + 1})`;
      }
      if (warning.columnName) {
        report += ` (Column: ${warning.columnName})`;
      }
      report += `\n`;
    });
  }

  return report;
}
