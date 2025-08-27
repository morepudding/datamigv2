/**
 * MODULE 6: INVENTORY PART PLAN
 * Configure les paramètres de planification des stocks
 * 
 * Différences critiques avec Inventory Part:
 * 1. Déduplication préalable : Une seule ligne par Number (première occurrence)
 * 2. Même logique extractAV : Règles identiques pour la sélection
 * 3. Même calcul CONTRACT : Même algorithme d'extraction
 * 4. Structure de sortie étendue : 31 colonnes au lieu de 19
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import logger from '../utils/logger';

interface InventoryPartPlanRow {
  'CONTRACT': string;
  'PART_NO': string;
  'CARRY_RATE': string;
  'LAST_ACTIVITY_DATE': string;
  'LOT_SIZE': number;
  'LOT_SIZE_AUTO_DB': string;
  'MAXWEEK_SUPPLY': number;
  'MAX_ORDER_QT': number;
  'MIN_ORDER_QTY': number;
  'MUL_ORDER_QTY': number;
  'ORDER_POINT_QTY': number;
  'ORDER_POINT_QTY_AUTO_DB': string;
  'ORDER_TRIP_DATE': string;
  'SAFETY_STOCK': number;
  'SAFETY_LEAD_TIME': number;
  'SAFETY_STOCK_AUTO_DB': string;
  'SERVICE_RATE': string;
  'SETUP_COST': string;
  'SHRINKAGE_FAC': number;
  'STD_ORDER_SIZE': number;
  'ORDER_REQUISITION_DB': string;
  'QTY_PREDICTED_CONSUMPTION': string;
  'PLANNING_METHOD': string;
  'PROPOSAL_RELEASE_DB': string;
  'PERCENT_MANUFACTURED': number;
  'PERCENT_ACQUIRED': number;
  'SPLIT_MANUF_ACQUIRED_DB': string;
  'ACQUIRED_SUPPLY_TYPE_DB': string;
  'MANUF_SUPPLY_TYPE_DB': string;
  'PLANNING_METHOD_AUTO_DB': string;
  'SCHED_CAPACITY_DB': string;
}

export class InventoryPartPlanProcessor extends BaseProcessor {
  constructor() {
    super('Inventory Part Plan');
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
   * Traitement principal avec déduplication préalable
   */
  protected processData(data: InputRow[]): InventoryPartPlanRow[] {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // Étape 1: Filtrage initial (Source ≠ "Buy")
    let filteredData = this.filterBySource(data, true);
    logger.info(this.moduleName, `After Source filter: ${filteredData.length} rows`);

    // DIFFÉRENCE 1: Déduplication préalable par Number (première occurrence)
    filteredData = this.deduplicateByKey(filteredData, row => this.cleanValue(row.Number));
    logger.info(this.moduleName, `After deduplication: ${filteredData.length} rows`);

    // Étape 2: Application des règles avec même logique extractAV
    const results = this.processWithExtractAV(filteredData);
    logger.info(this.moduleName, `Final results: ${results.length} rows`);

    return results;
  }

  /**
   * Fonction extractAV identique à Inventory Part
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
   * Calcul du CONTRACT identique à Inventory Part
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
   * Traitement avec même logique extractAV mais sans gestion d'occurrences multiples
   */
  private processWithExtractAV(data: InputRow[]): InventoryPartPlanRow[] {
    const results: InventoryPartPlanRow[] = [];

    data.forEach(row => {
      // Application des règles extractAV
      const avValue = this.extractAV(row);
      
      // Calcul de PART_NO : pas de gestion d'occurrences car déjà dédupliqué
      const PART_NO = (avValue === "AN29-02-00") ? this.cleanValue(row.Number) : "";
      
      // Ne conserver que les lignes avec PART_NO renseigné
      if (PART_NO) {
        results.push(this.transformRow(row, PART_NO));
      }
    });

    return results;
  }

  /**
   * Transformation d'une ligne vers le format de sortie étendu
   */
  private transformRow(row: InputRow, partNo: string): InventoryPartPlanRow {
    return {
      'CONTRACT': this.calculateContract(row),
      'PART_NO': partNo,
      'CARRY_RATE': '', // Toujours vide
      'LAST_ACTIVITY_DATE': '01/01/2020', // Toujours fixe
      'LOT_SIZE': 0, // Toujours fixe
      'LOT_SIZE_AUTO_DB': 'N', // Toujours fixe
      'MAXWEEK_SUPPLY': 0, // Toujours fixe
      'MAX_ORDER_QT': 0, // Toujours fixe
      'MIN_ORDER_QTY': 0, // Toujours fixe
      'MUL_ORDER_QTY': 0, // Toujours fixe
      'ORDER_POINT_QTY': 0, // Toujours fixe
      'ORDER_POINT_QTY_AUTO_DB': 'N', // Toujours fixe
      'ORDER_TRIP_DATE': '', // Toujours vide
      'SAFETY_STOCK': 0, // Toujours fixe
      'SAFETY_LEAD_TIME': 0, // Toujours fixe
      'SAFETY_STOCK_AUTO_DB': 'N', // Toujours fixe
      'SERVICE_RATE': '', // Toujours vide
      'SETUP_COST': '', // Toujours vide
      'SHRINKAGE_FAC': 0, // Toujours fixe
      'STD_ORDER_SIZE': 0, // Toujours fixe
      'ORDER_REQUISITION_DB': 'R', // Toujours fixe
      'QTY_PREDICTED_CONSUMPTION': '', // Toujours vide
      'PLANNING_METHOD': 'P', // Toujours fixe
      'PROPOSAL_RELEASE_DB': 'RELEASE', // Toujours fixe
      'PERCENT_MANUFACTURED': 0, // Toujours fixe
      'PERCENT_ACQUIRED': 100, // Toujours fixe
      'SPLIT_MANUF_ACQUIRED_DB': 'NO_SPLIT', // Toujours fixe
      'ACQUIRED_SUPPLY_TYPE_DB': 'R', // Toujours fixe
      'MANUF_SUPPLY_TYPE_DB': 'R', // Toujours fixe
      'PLANNING_METHOD_AUTO_DB': 'TRUE', // Toujours fixe
      'SCHED_CAPACITY_DB': 'I' // Toujours fixe
    };
  }

  /**
   * Génération du fichier CSV de sortie avec 31 colonnes
   */
  protected async generateOutput(data: InventoryPartPlanRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'CONTRACT' as keyof InventoryPartPlanRow, title: 'CONTRACT' },
      { id: 'PART_NO' as keyof InventoryPartPlanRow, title: 'PART_NO' },
      { id: 'CARRY_RATE' as keyof InventoryPartPlanRow, title: 'CARRY_RATE' },
      { id: 'LAST_ACTIVITY_DATE' as keyof InventoryPartPlanRow, title: 'LAST_ACTIVITY_DATE' },
      { id: 'LOT_SIZE' as keyof InventoryPartPlanRow, title: 'LOT_SIZE' },
      { id: 'LOT_SIZE_AUTO_DB' as keyof InventoryPartPlanRow, title: 'LOT_SIZE_AUTO_DB' },
      { id: 'MAXWEEK_SUPPLY' as keyof InventoryPartPlanRow, title: 'MAXWEEK_SUPPLY' },
      { id: 'MAX_ORDER_QT' as keyof InventoryPartPlanRow, title: 'MAX_ORDER_QT' },
      { id: 'MIN_ORDER_QTY' as keyof InventoryPartPlanRow, title: 'MIN_ORDER_QTY' },
      { id: 'MUL_ORDER_QTY' as keyof InventoryPartPlanRow, title: 'MUL_ORDER_QTY' },
      { id: 'ORDER_POINT_QTY' as keyof InventoryPartPlanRow, title: 'ORDER_POINT_QTY' },
      { id: 'ORDER_POINT_QTY_AUTO_DB' as keyof InventoryPartPlanRow, title: 'ORDER_POINT_QTY_AUTO_DB' },
      { id: 'ORDER_TRIP_DATE' as keyof InventoryPartPlanRow, title: 'ORDER_TRIP_DATE' },
      { id: 'SAFETY_STOCK' as keyof InventoryPartPlanRow, title: 'SAFETY_STOCK' },
      { id: 'SAFETY_LEAD_TIME' as keyof InventoryPartPlanRow, title: 'SAFETY_LEAD_TIME' },
      { id: 'SAFETY_STOCK_AUTO_DB' as keyof InventoryPartPlanRow, title: 'SAFETY_STOCK_AUTO_DB' },
      { id: 'SERVICE_RATE' as keyof InventoryPartPlanRow, title: 'SERVICE_RATE' },
      { id: 'SETUP_COST' as keyof InventoryPartPlanRow, title: 'SETUP_COST' },
      { id: 'SHRINKAGE_FAC' as keyof InventoryPartPlanRow, title: 'SHRINKAGE_FAC' },
      { id: 'STD_ORDER_SIZE' as keyof InventoryPartPlanRow, title: 'STD_ORDER_SIZE' },
      { id: 'ORDER_REQUISITION_DB' as keyof InventoryPartPlanRow, title: 'ORDER_REQUISITION_DB' },
      { id: 'QTY_PREDICTED_CONSUMPTION' as keyof InventoryPartPlanRow, title: 'QTY_PREDICTED_CONSUMPTION' },
      { id: 'PLANNING_METHOD' as keyof InventoryPartPlanRow, title: 'PLANNING_METHOD' },
      { id: 'PROPOSAL_RELEASE_DB' as keyof InventoryPartPlanRow, title: 'PROPOSAL_RELEASE_DB' },
      { id: 'PERCENT_MANUFACTURED' as keyof InventoryPartPlanRow, title: 'PERCENT_MANUFACTURED' },
      { id: 'PERCENT_ACQUIRED' as keyof InventoryPartPlanRow, title: 'PERCENT_ACQUIRED' },
      { id: 'SPLIT_MANUF_ACQUIRED_DB' as keyof InventoryPartPlanRow, title: 'SPLIT_MANUF_ACQUIRED_DB' },
      { id: 'ACQUIRED_SUPPLY_TYPE_DB' as keyof InventoryPartPlanRow, title: 'ACQUIRED_SUPPLY_TYPE_DB' },
      { id: 'MANUF_SUPPLY_TYPE_DB' as keyof InventoryPartPlanRow, title: 'MANUF_SUPPLY_TYPE_DB' },
      { id: 'PLANNING_METHOD_AUTO_DB' as keyof InventoryPartPlanRow, title: 'PLANNING_METHOD_AUTO_DB' },
      { id: 'SCHED_CAPACITY_DB' as keyof InventoryPartPlanRow, title: 'SCHED_CAPACITY_DB' }
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie
   */
  protected validateOutput(data: InventoryPartPlanRow[]): ValidationResult {
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
    const invalidPlanningMethod = data.filter(row => row.PLANNING_METHOD !== 'P');
    if (invalidPlanningMethod.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidPlanningMethod.length} rows with incorrect PLANNING_METHOD (should be P)`
      });
    }

    const invalidPercentAcquired = data.filter(row => row.PERCENT_ACQUIRED !== 100);
    if (invalidPercentAcquired.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidPercentAcquired.length} rows with incorrect PERCENT_ACQUIRED (should be 100)`
      });
    }

    // Vérification de l'unicité des PART_NO (devrait être garantie par la déduplication préalable)
    const partNumbers = data.map(row => row.PART_NO);
    const uniquePartNumbers = new Set(partNumbers);
    if (partNumbers.length !== uniquePartNumbers.size) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Duplicate PART_NO detected despite pre-deduplication'
      });
    }

    // Vérification de la date fixe
    const invalidLastActivityDate = data.filter(row => row.LAST_ACTIVITY_DATE !== '01/01/2020');
    if (invalidLastActivityDate.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidLastActivityDate.length} rows with incorrect LAST_ACTIVITY_DATE (should be 01/01/2020)`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
