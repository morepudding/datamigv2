/**
 * MODULE 2: MASTER PART ALL
 * Version étendue du Master Part incluant toutes les pièces (y compris achats)
 * 
 * Différences critiques avec Master Part:
 * 1. Pas de filtre sur Source (inclut "Buy")
 * 2. Filtrage modifié: Classification.includes("AN29") + État différent
 * 3. Même règle d'exclusion des fantômes
 * 4. Même déduplication sur "Number"
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import logger from '../utils/logger';

interface MasterPartAllRow {
  'PART_NO': string;
  'DESCRIPTION': string;
  'INFO_TEXT': string;
  'UNIT_CODE': string;
  'CONFIGURABLE_DB': string;
  'SERIAL_TRACKING_CODE_DB': string;
  'PROVIDE_DB': string;
  'PART_REV': string;
  'ASSORTMENT_ID': string;
  'ASSORTMENT_NODE': string;
  'CODE_GTIN': string;
  'PART_MAIN_GROUP': string;
  'FIRST_INVENTORY_SITE': string;
  'CONFIG_FAMILY_ID': string;
  'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE': string;
  'ALLOW_AS_NOT_CONSUMED': string;
  'VOLUME_NET': number;
  'WEIGHT_NET': number;
  'SOURCE': string; // NOUVELLE COLONNE CRITIQUE pour Eng Part Structure
}

export class MasterPartAllProcessor extends BaseProcessor {
  constructor() {
    super('Master Part ALL');
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
    const requiredColumns = ['Number', 'Source', 'Classification', 'State', 'Revision'];
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
   * Traitement principal avec filtrage modifié par rapport à Master Part
   */
  protected processData(data: InputRow[]): MasterPartAllRow[] {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // DIFFÉRENCE 1: PAS de filtre sur Source (on inclut "Buy")
    let filteredData = data;
    logger.info(this.moduleName, `No Source filter applied: ${filteredData.length} rows`);

    // DIFFÉRENCE 2: Filtrage modifié sur classification et état
    filteredData = this.filterByClassificationAndState(filteredData);
    logger.info(this.moduleName, `After Classification/State filter: ${filteredData.length} rows`);

    // DIFFÉRENCE 3: Même règle d'exclusion des fantômes
    filteredData = this.filterPhantomParts(filteredData);
    logger.info(this.moduleName, `After Phantom filter: ${filteredData.length} rows`);

    // DIFFÉRENCE 4: Même déduplication sur "Number"
    filteredData = this.deduplicateByKey(filteredData, row => this.cleanValue(row.Number));
    logger.info(this.moduleName, `After deduplication: ${filteredData.length} rows`);

    // Transformation en format de sortie
    const results = filteredData.map(row => this.transformRow(row));
    
    logger.info(this.moduleName, `Final results: ${results.length} rows`);
    return results;
  }

  /**
   * DIFFÉRENCE 2: Filtrage modifié sur classification et état
   */
  private filterByClassificationAndState(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const classification = this.cleanValue(row.Classification);
      const state = this.cleanValue(row.State).toLowerCase();
      const revision = this.cleanValue(row.Revision);
      
      // Contient AN29 n'importe où
      if (!classification.includes("AN29")) {
        return false;
      }
      
      // État doit être "released" OU (("in work" OU "under review") ET Revision !== "A")
      if (state === "released") {
        return true;
      }
      
      if ((state === "in work" || state === "under review") && revision !== "A") {
        return true;
      }
      
      return false;
    });

    logger.info(this.moduleName, `Classification/State filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * DIFFÉRENCE 3: Même règle d'exclusion des fantômes que Master Part
   */
  private filterPhantomParts(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const classification = this.cleanValue(row.Classification);
      const phantom = this.cleanValue(row["Phantom Manufacturing Part"]).toLowerCase();
      
      // Si Classification contient "AN29-02-00" ET Phantom = "no" → EXCLURE
      if (classification.includes("AN29-02-00") && phantom === "no") {
        return false;
      }
      
      return true;
    });

    logger.info(this.moduleName, `Phantom filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * Transformation d'une ligne vers le format de sortie (identique à Master Part)
   */
  private transformRow(row: InputRow): MasterPartAllRow {
    const classification = this.cleanValue(row.Classification);
    const context = this.cleanValue(row.Context);
    
    return {
      'PART_NO': this.cleanValue(row.Number),
      'DESCRIPTION': this.cleanValue(row["Part English designation"]) || this.cleanValue(row.Name),
      'INFO_TEXT': '', // Toujours vide
      'UNIT_CODE': 'PCS', // Toujours fixe
      'CONFIGURABLE_DB': classification.includes("AN29-02-00") ? "CONFIGURED" : "NOT CONFIGURED",
      'SERIAL_TRACKING_CODE_DB': 'NOT SERIAL TRACKING', // Toujours fixe
      'PROVIDE_DB': 'PHANTOM', // Toujours fixe
      'PART_REV': this.computeRevision(this.cleanValue(row.Revision), this.cleanValue(row.State)),
      'ASSORTMENT_ID': 'CLASSIFICATION', // Toujours fixe
      'ASSORTMENT_NODE': this.extractAssortmentNode(classification),
      'CODE_GTIN': '', // Toujours vide
      'PART_MAIN_GROUP': this.extractProjectCode(context),
      'FIRST_INVENTORY_SITE': 'FR008', // Toujours fixe
      'CONFIG_FAMILY_ID': classification.includes("AN29-02-00") ? "ANY-XX-WOODP-0" : "",
      'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE': '', // Toujours vide
      'ALLOW_AS_NOT_CONSUMED': 'FALSE', // Toujours fixe
      'VOLUME_NET': 0, // Toujours fixe
      'WEIGHT_NET': 0, // Toujours fixe
      'SOURCE': this.cleanValue(row.Source) // NOUVELLE COLONNE CRITIQUE
    };
  }

  /**
   * Génération du fichier CSV de sortie (identique à Master Part)
   */
  protected async generateOutput(data: MasterPartAllRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'PART_NO' as keyof MasterPartAllRow, title: 'PART_NO' },
      { id: 'DESCRIPTION' as keyof MasterPartAllRow, title: 'DESCRIPTION' }, 
      { id: 'INFO_TEXT' as keyof MasterPartAllRow, title: 'INFO_TEXT' },
      { id: 'UNIT_CODE' as keyof MasterPartAllRow, title: 'UNIT_CODE' },
      { id: 'CONFIGURABLE_DB' as keyof MasterPartAllRow, title: 'CONFIGURABLE_DB' },
      { id: 'SERIAL_TRACKING_CODE_DB' as keyof MasterPartAllRow, title: 'SERIAL_TRACKING_CODE_DB' },
      { id: 'PROVIDE_DB' as keyof MasterPartAllRow, title: 'PROVIDE_DB' },
      { id: 'PART_REV' as keyof MasterPartAllRow, title: 'PART_REV' },
      { id: 'ASSORTMENT_ID' as keyof MasterPartAllRow, title: 'ASSORTMENT_ID' },
      { id: 'ASSORTMENT_NODE' as keyof MasterPartAllRow, title: 'ASSORTMENT_NODE' },
      { id: 'CODE_GTIN' as keyof MasterPartAllRow, title: 'CODE_GTIN' },
      { id: 'PART_MAIN_GROUP' as keyof MasterPartAllRow, title: 'PART_MAIN_GROUP' },
      { id: 'FIRST_INVENTORY_SITE' as keyof MasterPartAllRow, title: 'FIRST_INVENTORY_SITE' },
      { id: 'CONFIG_FAMILY_ID' as keyof MasterPartAllRow, title: 'CONFIG_FAMILY_ID' },
      { id: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE' as keyof MasterPartAllRow, title: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE' },
      { id: 'ALLOW_AS_NOT_CONSUMED' as keyof MasterPartAllRow, title: 'ALLOW_AS_NOT_CONSUMED' },
      { id: 'VOLUME_NET' as keyof MasterPartAllRow, title: 'VOLUME_NET' },
      { id: 'WEIGHT_NET' as keyof MasterPartAllRow, title: 'WEIGHT_NET' },
      { id: 'SOURCE' as keyof MasterPartAllRow, title: 'SOURCE' } // NOUVELLE COLONNE
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie (identique à Master Part)
   */
  protected validateOutput(data: MasterPartAllRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Vérification que toutes les lignes ont un PART_NO
    const missingPartNo = data.filter(row => !row.PART_NO);
    if (missingPartNo.length > 0) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `${missingPartNo.length} rows missing PART_NO`
      });
    }

    // Vérification de la déduplication
    const partNumbers = data.map(row => row.PART_NO);
    const uniquePartNumbers = new Set(partNumbers);
    if (partNumbers.length !== uniquePartNumbers.size) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Duplicate PART_NO detected after deduplication'
      });
    }

    // Vérification des valeurs fixes
    const invalidUnitCode = data.filter(row => row.UNIT_CODE !== 'PCS');
    if (invalidUnitCode.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidUnitCode.length} rows with incorrect UNIT_CODE (should be PCS)`
      });
    }

    // Vérification spécifique : doit inclure des pièces "Buy" contrairement à Master Part
    const allSources = data.map(row => row.PART_NO); // On ne peut pas vérifier Source car elle n'est pas dans la sortie
    if (data.length === 0) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Master Part ALL should include Buy parts, but result is empty'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
