/**
 * MODULE 5: INVENTORY PART
 * Configure les pièces dans le module de gestion des stocks
 * 
 * Règles ultra-restrictives:
 * - Filtrage initial : Source ≠ "Buy" 
 * - Fonction extractAV avec règles de sélection AN29-02-00
 * - Gestion des occurrences multiples
 * - Calcul du CONTRACT depuis Site IFS
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import logger from '../utils/logger';

interface InventoryPartRow {
  'CONTRACT': string;
  'PART_NO': string;
  'DESCRIPTION': string;
  'PART_STATUS': string;
  'PLANNER_BUYER': string;
  'UNIT_MEAS': string;
  'CATCH_UNIT': string;
  'PART_PRODUCT_CODE': string;
  'TYPE_CODE_DB': string;
  'SAFETY_CODE': string;
  'INVENTORY_VALUATION_METHOD': string;
  'INVENTORY_PART_COST_LEVEL': string;
  'NB_OF_TROLLEYS_FOR_KIT': string;
  'SUPERDES_START_DATE': string;
  'CYCLE_COUNTING': string;
  'MRP_TO_DOP': string;
  'CUSTOMS_STATISTIC': string;
  'COUNTRY_OF_ORIGI': string;
  'C_PPV_STATUS': string;
}

export class InventoryPartProcessor extends BaseProcessor {
  constructor() {
    super('Inventory Part');
  }

  /**
   * Validation des données d'entrée
   */
  protected validateInput(data: InputRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || data.length === 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: 'No input data provided'
      });
    }

    // Vérification des colonnes obligatoires
    const requiredColumns = ['Number', 'Source', 'Name', 'Classification', 'Site IFS'];
    if (data.length > 0) {
      const firstRow = data[0];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        errors.push({
          type: 'MISSING_COLUMN',
          message: `Missing required columns: ${missingColumns.join(', ')}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Traitement principal avec règles ultra-restrictives
   */
  protected processData(data: InputRow[]): InventoryPartRow[] {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // Étape 1: Filtrage initial (Source ≠ "Buy")
    let filteredData = this.filterBySource(data, true);
    logger.info(this.moduleName, `After Source filter: ${filteredData.length} rows`);

    // Étape 2: Application des règles ultra-restrictives avec gestion des occurrences
    const results = this.processWithOccurrenceManagement(filteredData);
    logger.info(this.moduleName, `Final results: ${results.length} rows`);

    return results;
  }

  /**
   * Fonction extractAV avec règles de sélection ultra-restrictives
   */
  private extractAV(row: InputRow): string {
    // 1. Vérification longueur classification
    const classification = this.cleanValue(row.Classification);
    if (classification.length < 10) return "";
    
    // 2. Extraction des 10 derniers caractères
    const lastTen = classification.slice(-10);
    
    // 3. Vérification exacte "AN29-02-00"
    if (lastTen !== "AN29-02-00") return "";
    
    // 4. Vérification Phantom Manufacturing Part
    const phantom = this.cleanValue(row["Phantom Manufacturing Part"]).toLowerCase();
    if (phantom === "no") return "";
    
    // 5. Exclusion des versions A en cours de travail
    const state = this.cleanValue(row.State).toLowerCase();
    const revision = this.cleanValue(row.Revision);
    if ((state === "in work" || state === "under review") && revision === "A") {
      return "";
    }
    
    // Si toutes les conditions sont remplies
    return lastTen; // "AN29-02-00"
  }

  /**
   * Calcul du CONTRACT depuis Site IFS
   */
  private calculateContract(row: InputRow): string {
    const siteIFS = this.cleanValue(row["Site IFS"]);
    if (!siteIFS || siteIFS.length < 6) {
      return "";
    }
    
    // 5 premiers des 6 derniers caractères
    const lastSix = siteIFS.slice(-6);
    return lastSix.slice(0, 5);
  }

  /**
   * Traitement avec gestion des occurrences multiples
   */
  private processWithOccurrenceManagement(data: InputRow[]): InventoryPartRow[] {
    const results: InventoryPartRow[] = [];
    const occurrenceMap: Map<string, number> = new Map();

    data.forEach(row => {
      const partNumber = this.cleanValue(row.Number);
      
      // Gestion des occurrences
      const currentOccurrence = (occurrenceMap.get(partNumber) || 0) + 1;
      occurrenceMap.set(partNumber, currentOccurrence);

      // Application des règles extractAV
      const avValue = this.extractAV(row);
      
      // Calcul de PART_NO selon les règles
      const PART_NO = (currentOccurrence === 1 && avValue === "AN29-02-00") ? partNumber : "";
      
      // Ne conserver que les lignes avec PART_NO renseigné
      if (PART_NO) {
        results.push(this.transformRow(row, PART_NO));
      }
    });

    return results;
  }

  /**
   * Transformation d'une ligne vers le format de sortie
   */
  private transformRow(row: InputRow, partNo: string): InventoryPartRow {
    return {
      'CONTRACT': this.calculateContract(row),
      'PART_NO': partNo,
      'DESCRIPTION': this.cleanValue(row.Name),
      'PART_STATUS': 'A', // Toujours fixe
      'PLANNER_BUYER': '*', // Toujours fixe
      'UNIT_MEAS': 'PCS', // Toujours fixe
      'CATCH_UNIT': 'PCS', // Toujours fixe
      'PART_PRODUCT_CODE': 'BND00', // Toujours fixe
      'TYPE_CODE_DB': '1', // Toujours fixe
      'SAFETY_CODE': '', // Toujours vide
      'INVENTORY_VALUATION_METHOD': 'AV', // Toujours fixe
      'INVENTORY_PART_COST_LEVEL': 'COST PER CONFIGURATION', // Toujours fixe
      'NB_OF_TROLLEYS_FOR_KIT': '0', // Toujours fixe
      'SUPERDES_START_DATE': '', // Toujours vide
      'CYCLE_COUNTING': 'N', // Toujours fixe
      'MRP_TO_DOP': 'FALSE', // Toujours fixe
      'CUSTOMS_STATISTIC': '', // Toujours vide
      'COUNTRY_OF_ORIGI': '', // Toujours vide
      'C_PPV_STATUS': '' // Toujours vide
    };
  }

  /**
   * Génération du fichier CSV de sortie
   */
  protected async generateOutput(data: InventoryPartRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'CONTRACT' as keyof InventoryPartRow, title: 'CONTRACT' },
      { id: 'PART_NO' as keyof InventoryPartRow, title: 'PART_NO' },
      { id: 'DESCRIPTION' as keyof InventoryPartRow, title: 'DESCRIPTION' },
      { id: 'PART_STATUS' as keyof InventoryPartRow, title: 'PART_STATUS' },
      { id: 'PLANNER_BUYER' as keyof InventoryPartRow, title: 'PLANNER_BUYER' },
      { id: 'UNIT_MEAS' as keyof InventoryPartRow, title: 'UNIT_MEAS' },
      { id: 'CATCH_UNIT' as keyof InventoryPartRow, title: 'CATCH_UNIT' },
      { id: 'PART_PRODUCT_CODE' as keyof InventoryPartRow, title: 'PART_PRODUCT_CODE' },
      { id: 'TYPE_CODE_DB' as keyof InventoryPartRow, title: 'TYPE_CODE_DB' },
      { id: 'SAFETY_CODE' as keyof InventoryPartRow, title: 'SAFETY_CODE' },
      { id: 'INVENTORY_VALUATION_METHOD' as keyof InventoryPartRow, title: 'INVENTORY_VALUATION_METHOD' },
      { id: 'INVENTORY_PART_COST_LEVEL' as keyof InventoryPartRow, title: 'INVENTORY_PART_COST_LEVEL' },
      { id: 'NB_OF_TROLLEYS_FOR_KIT' as keyof InventoryPartRow, title: 'NB_OF_TROLLEYS_FOR_KIT' },
      { id: 'SUPERDES_START_DATE' as keyof InventoryPartRow, title: 'SUPERDES_START_DATE' },
      { id: 'CYCLE_COUNTING' as keyof InventoryPartRow, title: 'CYCLE_COUNTING' },
      { id: 'MRP_TO_DOP' as keyof InventoryPartRow, title: 'MRP_TO_DOP' },
      { id: 'CUSTOMS_STATISTIC' as keyof InventoryPartRow, title: 'CUSTOMS_STATISTIC' },
      { id: 'COUNTRY_OF_ORIGI' as keyof InventoryPartRow, title: 'COUNTRY_OF_ORIGI' },
      { id: 'C_PPV_STATUS' as keyof InventoryPartRow, title: 'C_PPV_STATUS' }
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie
   */
  protected validateOutput(data: InventoryPartRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Vérification que toutes les lignes ont un PART_NO
    const missingPartNo = data.filter(row => !row.PART_NO);
    if (missingPartNo.length > 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `${missingPartNo.length} rows missing PART_NO`
      });
    }

    // Vérification que toutes les lignes ont un CONTRACT
    const missingContract = data.filter(row => !row.CONTRACT);
    if (missingContract.length > 0) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `${missingContract.length} rows missing CONTRACT`
      });
    }

    // Vérification des valeurs fixes
    const invalidUnitMeas = data.filter(row => row.UNIT_MEAS !== 'PCS');
    if (invalidUnitMeas.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidUnitMeas.length} rows with incorrect UNIT_MEAS (should be PCS)`
      });
    }

    const invalidPartStatus = data.filter(row => row.PART_STATUS !== 'A');
    if (invalidPartStatus.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidPartStatus.length} rows with incorrect PART_STATUS (should be A)`
      });
    }

    // Vérification de l'unicité des PART_NO (devrait être garantie par la logique des occurrences)
    const partNumbers = data.map(row => row.PART_NO);
    const uniquePartNumbers = new Set(partNumbers);
    if (partNumbers.length !== uniquePartNumbers.size) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Duplicate PART_NO detected despite occurrence management'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
