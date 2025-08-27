// Utilitaires pour la gestion des fichiers Excel
import * as xlsx from 'xlsx';
import { InputRow, ValidationResult, ValidationError } from '../types/migration';

/**
 * Lit un fichier Excel et retourne les données sous forme de tableau d'objets
 */
export function readExcelFile(filePath: string, sheetName?: string): InputRow[] {
  try {
    const workbook = xlsx.readFile(filePath);
    const targetSheetName = sheetName || workbook.SheetNames[0];
    
    if (!workbook.Sheets[targetSheetName]) {
      throw new Error(`Sheet "${targetSheetName}" not found in Excel file`);
    }

    // Utiliser defval: "" pour que les cellules vides deviennent des chaînes vides
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[targetSheetName], { 
      defval: "" 
    }) as InputRow[];

    return data;
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Lit un fichier Excel depuis un buffer
 */
export function readExcelFromBuffer(buffer: Buffer, sheetName?: string): InputRow[] {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const targetSheetName = sheetName || workbook.SheetNames[0];
    
    if (!workbook.Sheets[targetSheetName]) {
      throw new Error(`Sheet "${targetSheetName}" not found in Excel file`);
    }

    const data = xlsx.utils.sheet_to_json(workbook.Sheets[targetSheetName], { 
      defval: "" 
    }) as InputRow[];

    return data;
  } catch (error) {
    throw new Error(`Failed to read Excel from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Valide la structure d'un fichier Excel selon les colonnes requises
 */
export function validateExcelStructure(data: InputRow[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!data || data.length === 0) {
    errors.push({
      type: 'MISSING_COLUMN',
      message: 'Excel file is empty or could not be read'
    });
    return { isValid: false, errors, warnings: [] };
  }

  // Colonnes obligatoires selon la documentation
  const requiredColumns = [
    'Number',
    'Name',
    'Part English designation',
    'Classification',
    'Source',
    'State',
    'Version',
    'Context',
    'Phantom Manufacturing Part',
    'Site IFS',
    'Structure Level',
    'Quantity'
  ];

  const firstRow = data[0];
  const availableColumns = Object.keys(firstRow);

  // Vérifier les colonnes manquantes
  requiredColumns.forEach(column => {
    if (!availableColumns.includes(column)) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `Required column "${column}" is missing from Excel file`,
        columnName: column
      });
    }
  });

  // Vérifier que les colonnes obligatoires ne sont pas toutes vides
  requiredColumns.forEach(column => {
    if (availableColumns.includes(column)) {
      const hasNonEmptyValue = data.some(row => {
        const value = row[column];
        return value !== null && value !== undefined && value.toString().trim() !== '';
      });
      
      if (!hasNonEmptyValue) {
        errors.push({
          type: 'INVALID_VALUE',
          message: `Column "${column}" exists but contains no valid data`,
          columnName: column
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

/**
 * Extrait le code projet depuis la colonne Context
 */
export function extractProjectCode(data: InputRow[]): string {
  if (!data || data.length === 0) {
    return 'XXXXX';
  }

  const firstRow = data[0];
  if (!firstRow.Context) {
    return 'XXXXX';
  }

  const context = firstRow.Context.toString().trim();
  if (context.length >= 5) {
    // Vérifier le format [A-Z0-9]{5}
    const code = context.substring(0, 5);
    if (/^[A-Z0-9]{5}$/.test(code)) {
      return code;
    }
  }

  return 'XXXXX';
}

/**
 * Nettoie et normalise une valeur de cellule Excel
 */
export function cleanCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  return value.toString().trim();
}

/**
 * Vérifie si une valeur correspond au format booléen attendu
 */
export function parseBooleanValue(value: any, trueValues: string[] = ['yes', 'true', '1'], falseValues: string[] = ['no', 'false', '0']): boolean | null {
  const cleanValue = cleanCellValue(value).toLowerCase();
  
  if (trueValues.includes(cleanValue)) {
    return true;
  }
  
  if (falseValues.includes(cleanValue)) {
    return false;
  }
  
  return null;
}

/**
 * Extrait les informations de base d'un fichier Excel pour le logging
 */
export function getExcelFileInfo(filePath: string): { sheetNames: string[], rowCount: number, columnCount: number } {
  try {
    const workbook = xlsx.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet);
    
    return {
      sheetNames: workbook.SheetNames,
      rowCount: data.length,
      columnCount: data.length > 0 ? Object.keys(data[0] as any).length : 0
    };
  } catch (error) {
    return {
      sheetNames: [],
      rowCount: 0,
      columnCount: 0
    };
  }
}
