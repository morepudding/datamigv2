/**
 * MODULE 1: MASTER PART
 * Génère le référentiel principal des pièces manufacturées (hors achats)
 * 
 * Règles de filtrage:
 * 1. Exclusion des pièces d'achat (Source !== "Buy")
 * 2. Classification >= 10 caractères avec "AN29" dans les 10 derniers
 * 3. Exclusion des pièces fantômes spécifiques (AN29-02-00 + Phantom = "no")
 * 4. Exclusion des révisions A en cours de travail
 * 5. Déduplication sur colonne "Number"
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import logger from '../utils/logger';

interface MasterPartRow {
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
}

export class MasterPartProcessor extends BaseProcessor {
  constructor() {
    super('Master Part');
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
   * Traitement principal avec les 5 étapes de filtrage
   */
  protected processData(data: InputRow[]): MasterPartRow[] {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // ÉTAPE 1: Exclusion des pièces d'achat
    let filteredData = this.filterBySource(data, true);
    logger.info(this.moduleName, `After Source filter: ${filteredData.length} rows`);

    // ÉTAPE 2: Filtrage sur classification
    filteredData = this.filterByClassification(filteredData);
    logger.info(this.moduleName, `After Classification filter: ${filteredData.length} rows`);

    // ÉTAPE 3: Exclusion des pièces obsolètes
    filteredData = this.filterObsoleteParts(filteredData);
    logger.info(this.moduleName, `After Obsolete filter: ${filteredData.length} rows`);

    // ÉTAPE 4: Exclusion des pièces fantômes spécifiques
    filteredData = this.filterPhantomParts(filteredData);
    logger.info(this.moduleName, `After Phantom filter: ${filteredData.length} rows`);

    // ÉTAPE 5: Exclusion des révisions A en cours de travail
    filteredData = this.filterRevisionA(filteredData);
    logger.info(this.moduleName, `After Revision A filter: ${filteredData.length} rows`);

    // ÉTAPE 6: Déduplication sur colonne "Number"
    filteredData = this.deduplicateByKey(filteredData, row => this.cleanValue(row.Number));
    logger.info(this.moduleName, `After deduplication: ${filteredData.length} rows`);

    // Transformation en format de sortie
    const results = filteredData.map(row => this.transformRow(row));
    
    logger.info(this.moduleName, `Final results: ${results.length} rows`);
    return results;
  }

  /**
   * ÉTAPE 2: Filtrage sur classification
   */
  private filterByClassification(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const classification = this.cleanValue(row.Classification);
      
      // Minimum 10 caractères
      if (classification.length < 10) {
        return false;
      }
      
      // Les 4 premiers des 10 derniers = "AN29"
      const lastTen = classification.slice(-10);
      const firstFour = lastTen.slice(0, 4);
      
      return firstFour === "AN29";
    });

    logger.info(this.moduleName, `Classification filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * ÉTAPE 3: Exclusion des pièces fantômes spécifiques
   */
  private filterPhantomParts(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const classification = this.cleanValue(row.Classification);
      const phantom = this.cleanValue(row["Phantom Manufacturing Part"]).toLowerCase();
      
      // Si Classification se termine par "AN29-02-00" ET Phantom = "no" → EXCLURE
      if (classification.slice(-10) === "AN29-02-00" && phantom === "no") {
        return false;
      }
      
      return true;
    });

    logger.info(this.moduleName, `Phantom filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * ÉTAPE 3: Exclusion des pièces obsolètes
   * Si [State] = Obsolète → Ne pas injecter la pièce dans la nomenclature
   */
  private filterObsoleteParts(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const state = this.cleanValue(row.State).toLowerCase();
      
      // Si State = "Obsolète" → EXCLURE
      if (state === "obsolète" || state === "obsolete") {
        return false;
      }
      
      return true;
    });
    
    logger.info(this.moduleName, `Obsolete filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * ÉTAPE 5: Exclusion des révisions A en cours de travail
   */
  private filterRevisionA(data: InputRow[]): InputRow[] {
    const filtered = data.filter(row => {
      const state = this.cleanValue(row.State).toLowerCase();
      const revision = this.cleanValue(row.Revision);
      
      // Si (State = "in work" OU "under review") ET Revision = "A" → EXCLURE
      if ((state === "in work" || state === "under review") && revision === "A") {
        return false;
      }
      
      return true;
    });

    logger.info(this.moduleName, `Revision A filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * Calcul de la révision selon les règles métier
   * - Si [State] = Released → [Revision] reste telle quelle
   * - Si [State] = Under Review ET [Revision] <> A → [Revision] = N-1 (exemple B devient A)
   * - Si [State] = In Work ET [Revision] <> A → [Revision] = N-1 (exemple B devient A)
   * - Sinon révision reste vide
   */
  private computeRevision(revision: string, state: string): string {
    const cleanState = state.toLowerCase().trim();
    const cleanRevision = revision.trim().toUpperCase();
    
    // Si State = "Released" → Retourner la révision telle quelle
    if (cleanState === "released") {
      return cleanRevision;
    }
    
    // Si State = "Under Review" ET Revision <> "A" → Revision = N-1
    if (cleanState === "under review" && cleanRevision !== "A") {
      return this.decrementRevision(cleanRevision);
    }
    
    // Si State = "In Work" ET Revision <> "A" → Revision = N-1  
    if (cleanState === "in work" && cleanRevision !== "A") {
      return this.decrementRevision(cleanRevision);
    }
    
    // Dans tous les autres cas, révision vide
    return '';
  }

  /**
   * Décrémente une révision (B -> A, C -> B, etc.)
   */
  private decrementRevision(revision: string): string {
    if (!revision || revision.length === 0) return '';
    
    const char = revision.charAt(0);
    if (char >= 'B' && char <= 'Z') {
      return String.fromCharCode(char.charCodeAt(0) - 1);
    }
    
    // Si c'est déjà 'A' ou autre chose, retourner 'A'
    return 'A';
  }

  /**
   * Extrait le site IFS depuis le champ "Site IFS"
   * Exemple: "SAINT GILLES (FR014)" → "FR014"
   */
  private extractSiteIFS(siteIFS: string): string {
    if (!siteIFS) return '';
    
    const match = siteIFS.match(/\(([A-Z0-9]+)\)/);
    return match ? match[1] : '';
  }

  /**
   * Transformation d'une ligne vers le format de sortie
   */
  private transformRow(row: InputRow): MasterPartRow {
    const classification = this.cleanValue(row.Classification);
    const context = this.cleanValue(row.Context);
    const isAN2902 = classification.includes("AN29-02-00");
    
    return {
      'PART_NO': this.cleanValue(row.Number),
      'DESCRIPTION': this.cleanValue(row["Part English designation"]) || this.cleanValue(row.Name),
      'INFO_TEXT': '', // Toujours vide
      'UNIT_CODE': 'PCS', // Toujours fixe
      'CONFIGURABLE_DB': isAN2902 ? "CONFIGURED" : "NOT CONFIGURED",
      'SERIAL_TRACKING_CODE_DB': 'NOT SERIAL TRACKING', // Toujours fixe
      'PROVIDE_DB': 'PHANTOM', // Toujours fixe
      'PART_REV': this.computeRevision(this.cleanValue(row.Revision), this.cleanValue(row.State)),
      'ASSORTMENT_ID': 'CLASSIFICATION', // Toujours fixe
      'ASSORTMENT_NODE': this.extractAssortmentNode(classification),
      'CODE_GTIN': '', // Toujours vide
      'PART_MAIN_GROUP': this.extractProjectCode(context),
      'FIRST_INVENTORY_SITE': isAN2902 ? this.extractSiteIFS(this.cleanValue(row["Site IFS"])) : "",
      'CONFIG_FAMILY_ID': isAN2902 ? "ANY-XX-WOOD-P" : "",
      'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE': '', // Toujours vide
      'ALLOW_AS_NOT_CONSUMED': 'FALSE', // Toujours fixe
      'VOLUME_NET': 0, // Toujours fixe
      'WEIGHT_NET': 0 // Toujours fixe
    };
  }

  /**
   * Génération du fichier CSV de sortie
   */
  protected async generateOutput(data: MasterPartRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'PART_NO' as keyof MasterPartRow, title: 'PART_NO' },
      { id: 'DESCRIPTION' as keyof MasterPartRow, title: 'DESCRIPTION' }, 
      { id: 'INFO_TEXT' as keyof MasterPartRow, title: 'INFO_TEXT' },
      { id: 'UNIT_CODE' as keyof MasterPartRow, title: 'UNIT_CODE' },
      { id: 'CONFIGURABLE_DB' as keyof MasterPartRow, title: 'CONFIGURABLE_DB' },
      { id: 'SERIAL_TRACKING_CODE_DB' as keyof MasterPartRow, title: 'SERIAL_TRACKING_CODE_DB' },
      { id: 'PROVIDE_DB' as keyof MasterPartRow, title: 'PROVIDE_DB' },
      { id: 'PART_REV' as keyof MasterPartRow, title: 'PART_REV' },
      { id: 'ASSORTMENT_ID' as keyof MasterPartRow, title: 'ASSORTMENT_ID' },
      { id: 'ASSORTMENT_NODE' as keyof MasterPartRow, title: 'ASSORTMENT_NODE' },
      { id: 'CODE_GTIN' as keyof MasterPartRow, title: 'CODE_GTIN' },
      { id: 'PART_MAIN_GROUP' as keyof MasterPartRow, title: 'PART_MAIN_GROUP' },
      { id: 'FIRST_INVENTORY_SITE' as keyof MasterPartRow, title: 'FIRST_INVENTORY_SITE' },
      { id: 'CONFIG_FAMILY_ID' as keyof MasterPartRow, title: 'CONFIG_FAMILY_ID' },
      { id: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE' as keyof MasterPartRow, title: 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE' },
      { id: 'ALLOW_AS_NOT_CONSUMED' as keyof MasterPartRow, title: 'ALLOW_AS_NOT_CONSUMED' },
      { id: 'VOLUME_NET' as keyof MasterPartRow, title: 'VOLUME_NET' },
      { id: 'WEIGHT_NET' as keyof MasterPartRow, title: 'WEIGHT_NET' }
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie
   */
  protected validateOutput(data: MasterPartRow[]): ValidationResult {
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
