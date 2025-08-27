// Utilitaires pour la génération de fichiers CSV
import * as fs from 'fs';
import * as path from 'path';
import * as csvWriter from 'csv-writer';
import { DEFAULT_PIPELINE_CONFIG } from '../types/migration';

/**
 * Configuration par défaut pour les fichiers CSV
 */
const CSV_CONFIG = {
  fieldDelimiter: DEFAULT_PIPELINE_CONFIG.csvDelimiter, // Point-virgule obligatoire selon la doc
  encoding: DEFAULT_PIPELINE_CONFIG.encoding as BufferEncoding
};

/**
 * Génère un fichier CSV avec les données et headers spécifiés
 */
export async function generateCSV<T extends Record<string, any>>(
  data: T[],
  headers: Array<{ id: keyof T; title: string }>,
  outputPath: string
): Promise<void> {
  try {
    // S'assurer que le dossier de destination existe
    const directory = path.dirname(outputPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const writer = csvWriter.createObjectCsvWriter({
      path: outputPath,
      header: headers as any, // Type assertion pour compatibility avec csv-writer
      fieldDelimiter: CSV_CONFIG.fieldDelimiter,
      encoding: CSV_CONFIG.encoding
    });

    await writer.writeRecords(data);
  } catch (error) {
    throw new Error(`Failed to generate CSV file at ${outputPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Lit un fichier CSV et retourne les données
 */
export function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`CSV file not found: ${filePath}`));
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, CSV_CONFIG.encoding);
      const lines = fileContent.split('\n');
      
      if (lines.length < 2) {
        resolve([]);
        return;
      }

      const headers = lines[0].split(CSV_CONFIG.fieldDelimiter).map(h => h.trim().replace(/"/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const values = line.split(CSV_CONFIG.fieldDelimiter).map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        results.push(row);
      }
      
      resolve(results);
    } catch (error) {
      reject(new Error(`Failed to read CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Valide qu'un fichier CSV a été généré correctement
 */
export function validateCSVFile(filePath: string, expectedRowCount?: number): { isValid: boolean; actualRowCount: number; fileSize: number } {
  try {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, actualRowCount: 0, fileSize: 0 };
    }

    const stats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath, CSV_CONFIG.encoding);
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // -1 car on ne compte pas la ligne d'en-tête
    const actualRowCount = Math.max(0, lines.length - 1);
    
    const isValid = expectedRowCount === undefined || actualRowCount === expectedRowCount;
    
    return {
      isValid,
      actualRowCount,
      fileSize: stats.size
    };
  } catch (error) {
    return { isValid: false, actualRowCount: 0, fileSize: 0 };
  }
}

/**
 * Génère les headers pour le fichier Master Part (18 colonnes)
 */
export function getMasterPartHeaders() {
  return [
    { id: 'PART_NO', title: 'PART_NO' },
    { id: 'DESCRIPTION', title: 'DESCRIPTION' },
    { id: 'INFO_TEXT', title: 'INFO_TEXT' },
    { id: 'UNIT_CODE', title: 'UNIT_CODE' },
    { id: 'CONFIGURABLE_DB', title: 'CONFIGURABLE_DB' },
    { id: 'SERIAL_TRACKING_CODE_DB', title: 'SERIAL_TRACKING_CODE_DB' },
    { id: 'PROVIDE_DB', title: 'PROVIDE_DB' },
    { id: 'PART_REV', title: 'PART_REV' },
    { id: 'ASSORTMENT_ID', title: 'ASSORTMENT_ID' },
    { id: 'ASSORTMENT_NODE', title: 'ASSORTMENT_NODE' },
    { id: 'CODE_GTIN', title: 'CODE_GTIN' },
    { id: 'PART_MAIN_GROUP', title: 'PART_MAIN_GROUP' },
    { id: 'FIRST_INVENTORY_SITE', title: 'FIRST_INVENTORY_SITE' },
    { id: 'CONFIG_FAMILY_ID', title: 'CONFIG_FAMILY_ID' },
    { id: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE', title: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE' },
    { id: 'ALLOW_AS_NOT_CONSUMED', title: 'ALLOW_AS_NOT_CONSUMED' },
    { id: 'VOLUME_NET', title: 'VOLUME_NET' },
    { id: 'WEIGHT_NET', title: 'WEIGHT_NET' }
  ] as const;
}

/**
 * Génère les headers pour le fichier Eng Part Structure (7 colonnes)
 */
export function getEngStructureHeaders() {
  return [
    { id: 'PART NO', title: 'PART NO' },
    { id: 'PART REV', title: 'PART REV' },
    { id: 'SUB PART NO', title: 'SUB PART NO' },
    { id: 'SUB PART REV', title: 'SUB PART REV' },
    { id: 'QTY', title: 'QTY' },
    { id: 'STR COMMENT', title: 'STR COMMENT' },
    { id: 'SORT NO', title: 'SORT NO' }
  ] as const;
}

/**
 * Génère les headers pour le fichier Inventory Part (19 colonnes)
 */
export function getInventoryPartHeaders() {
  return [
    { id: 'CONTRACT', title: 'CONTRACT' },
    { id: 'PART_NO', title: 'PART_NO' },
    { id: 'DESCRIPTION', title: 'DESCRIPTION' },
    { id: 'PART_STATUS', title: 'PART_STATUS' },
    { id: 'PLANNER_BUYER', title: 'PLANNER_BUYER' },
    { id: 'UNIT_MEAS', title: 'UNIT_MEAS' },
    { id: 'CATCH_UNIT', title: 'CATCH_UNIT' },
    { id: 'PART_PRODUCT_CODE', title: 'PART_PRODUCT_CODE' },
    { id: 'TYPE_CODE_DB', title: 'TYPE_CODE_DB' },
    { id: 'SAFETY_CODE', title: 'SAFETY_CODE' },
    { id: 'INVENTORY_VALUATION_METHOD', title: 'INVENTORY_VALUATION_METHOD' },
    { id: 'INVENTORY_PART_COST_LEVEL', title: 'INVENTORY_PART_COST_LEVEL' },
    { id: 'NB_OF_TROLLEYS_FOR_KIT', title: 'NB_OF_TROLLEYS_FOR_KIT' },
    { id: 'SUPERDES_START_DATE', title: 'SUPERDES_START_DATE' },
    { id: 'CYCLE_COUNTING', title: 'CYCLE_COUNTING' },
    { id: 'MRP_TO_DOP', title: 'MRP_TO_DOP' },
    { id: 'CUSTOMS_STATISTIC', title: 'CUSTOMS_STATISTIC' },
    { id: 'COUNTRY_OF_ORIGI', title: 'COUNTRY_OF_ORIGI' },
    { id: 'C_PPV_STATUS', title: 'C_PPV_STATUS' }
  ] as const;
}

/**
 * Génère les headers pour le fichier Inventory Part Plan (31 colonnes)
 */
export function getInventoryPartPlanHeaders() {
  return [
    { id: 'CONTRACT', title: 'CONTRACT' },
    { id: 'PART_NO', title: 'PART_NO' },
    { id: 'CARRY_RATE', title: 'CARRY_RATE' },
    { id: 'LAST_ACTIVITY_DATE', title: 'LAST_ACTIVITY_DATE' },
    { id: 'LOT_SIZE', title: 'LOT_SIZE' },
    { id: 'LOT_SIZE_AUTO_DB', title: 'LOT_SIZE_AUTO_DB' },
    { id: 'MAXWEEK_SUPPLY', title: 'MAXWEEK_SUPPLY' },
    { id: 'MAX_ORDER_QT', title: 'MAX_ORDER_QT' },
    { id: 'MIN_ORDER_QTY', title: 'MIN_ORDER_QTY' },
    { id: 'MUL_ORDER_QTY', title: 'MUL_ORDER_QTY' },
    { id: 'ORDER_POINT_QTY', title: 'ORDER_POINT_QTY' },
    { id: 'ORDER_POINT_QTY_AUTO_DB', title: 'ORDER_POINT_QTY_AUTO_DB' },
    { id: 'ORDER_TRIP_DATE', title: 'ORDER_TRIP_DATE' },
    { id: 'SAFETY_STOCK', title: 'SAFETY_STOCK' },
    { id: 'SAFETY_LEAD_TIME', title: 'SAFETY_LEAD_TIME' },
    { id: 'SAFETY_STOCK_AUTO_DB', title: 'SAFETY_STOCK_AUTO_DB' },
    { id: 'SERVICE_RATE', title: 'SERVICE_RATE' },
    { id: 'SETUP_COST', title: 'SETUP_COST' },
    { id: 'SHRINKAGE_FAC', title: 'SHRINKAGE_FAC' },
    { id: 'STD_ORDER_SIZE', title: 'STD_ORDER_SIZE' },
    { id: 'ORDER_REQUISITION_DB', title: 'ORDER_REQUISITION_DB' },
    { id: 'QTY_PREDICTED_CONSUMPTION', title: 'QTY_PREDICTED_CONSUMPTION' },
    { id: 'PLANNING_METHOD', title: 'PLANNING_METHOD' },
    { id: 'PROPOSAL_RELEASE_DB', title: 'PROPOSAL_RELEASE_DB' },
    { id: 'PERCENT_MANUFACTURED', title: 'PERCENT_MANUFACTURED' },
    { id: 'PERCENT_ACQUIRED', title: 'PERCENT_ACQUIRED' },
    { id: 'SPLIT_MANUF_ACQUIRED_DB', title: 'SPLIT_MANUF_ACQUIRED_DB' },
    { id: 'ACQUIRED_SUPPLY_TYPE_DB', title: 'ACQUIRED_SUPPLY_TYPE_DB' },
    { id: 'MANUF_SUPPLY_TYPE_DB', title: 'MANUF_SUPPLY_TYPE_DB' },
    { id: 'PLANNING_METHOD_AUTO_DB', title: 'PLANNING_METHOD_AUTO_DB' },
    { id: 'SCHED_CAPACITY_DB', title: 'SCHED_CAPACITY_DB' }
  ] as const;
}

/**
 * Génère les headers pour le fichier Technical Spec Values (4 colonnes)
 */
export function getTechnicalSpecHeaders() {
  return [
    { id: 'MASTER_PART', title: 'MASTER_PART' },
    { id: 'ATTRIBUT', title: 'ATTRIBUT' },
    { id: 'VALEUR', title: 'VALEUR' },
    { id: 'TYPE', title: 'TYPE' }
  ] as const;
}

/**
 * Calcule la taille d'un fichier CSV en bytes
 */
export function getFileSize(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Supprime un fichier CSV s'il existe
 */
export function deleteCSVFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
