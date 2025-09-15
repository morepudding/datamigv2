/**
 * MODULE 4: ENG PART STRUCTURE
 * Définit les liens parent-enfant dans les nomenclatures d'ingénierie
 * 
 * Prérequis obligatoire:
 * - Le fichier master_part.csv DOIT exister dans le dossier output
 * - Lecture et indexation de master_part.csv par PART_NO
 * - Algorithme complexe AX, AY, AZ pour calculer les relations parent-enfant
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import { readCSV } from '../utils/csv';
import logger from '../utils/logger';
import * as path from 'path';

interface EngStructureRow {
  'PART NO': string;
  'PART REV': string;
  'SUB PART NO': string;
  'SUB PART REV': string;
  'QTY': string;
  'STR COMMENT': string;
  'SORT NO': number;
}

export class EngStructureProcessor extends BaseProcessor {
  private masterPartAllData: any[] = [];
  private masterIndex: Map<string, any> = new Map();

  constructor() {
    super('Eng Part Structure');
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
    const requiredColumns = ['Number', 'Structure Level', 'Revision', 'State', 'Quantity'];
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
   * Traitement principal avec l'algorithme AX, AY, AZ
   */
  protected async processData(data: InputRow[]): Promise<EngStructureRow[]> {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // Étape 1: Chargement et indexation du fichier master_part.csv
    await this.loadMasterPartAllData();
    logger.info(this.moduleName, `Loaded ${this.masterPartAllData.length} master part ALL records`);

    // Étape 2: Calcul des variables intermédiaires AX, AY, AZ
    const bomWithVariables = this.calculateVariables(data);
    logger.info(this.moduleName, `Calculated intermediate variables for ${bomWithVariables.length} rows`);

    // Étape 3: Filtrage et transformation selon les règles métier
    const results = this.processStructureRows(bomWithVariables);
    logger.info(this.moduleName, `Final results after processing: ${results.length} rows`);

    return results;
  }

  /**
   * Chargement et indexation du fichier master_part.csv
   */
  private async loadMasterPartAllData(): Promise<void> {
    try {
      // Chemin compatible Vercel et local
      const outputDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'output');
      const masterPartAllPath = path.join(outputDir, 'master_part_all.csv');
      this.masterPartAllData = await readCSV(masterPartAllPath);
      
      if (this.masterPartAllData.length === 0) {
        throw new Error('Master Part ALL file is empty or not found');
      }

      // Création de l'index pour accès rapide
      this.masterIndex = new Map();
      this.masterPartAllData.forEach(part => {
        if (part['PART_NO']) {
          this.masterIndex.set(part['PART_NO'], part);
        }
      });

      logger.info(this.moduleName, `Created index with ${this.masterIndex.size} entries`);
    } catch (error) {
      throw new Error(`Failed to load master part ALL data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcul des variables intermédiaires AX, AY, AZ pour chaque ligne
   */
  private calculateVariables(data: InputRow[]): Array<InputRow & { AX: string; AY: string; AZ: number }> {
    return data.map((row, i) => {
      const structureLevel = parseInt(this.cleanValue(row["Structure Level"]) || "0", 10);
      
      // Variable AX - Identification du Parent
      let AX = "";
      if (structureLevel > 0) {
        // Recherche rétrograde pour trouver le parent
        for (let j = i - 1; j >= 0; j--) {
          const prevLevel = parseInt(this.cleanValue(data[j]["Structure Level"]) || "0", 10);
          if (prevLevel === (structureLevel - 1)) {
            AX = this.cleanValue(data[j]["Number"]);
            break;
          }
        }
      }

      // Variable AY - Vérification dans Master Part ALL
      const AY = (AX && this.masterIndex.has(AX)) ? "FOUND" : "";

      // Variable AZ - Compteur d'Occurrences du Parent
      let AZ = 0;
      if (AY !== "") {
        let count = 0;
        for (let k = 0; k <= i; k++) {
          if (this.cleanValue(data[k]["Number"]) === AX) {
            count++;
          }
        }
        AZ = count;
      }

      return {
        ...row,
        AX,
        AY, 
        AZ
      };
    });
  }

  /**
   * Traitement des lignes de structure selon les règles métier avec logging détaillé
   */
  private processStructureRows(data: Array<InputRow & { AX: string; AY: string; AZ: number }>): EngStructureRow[] {
    const results: EngStructureRow[] = [];
    let excludedReasons: { [key: string]: number } = {
      'PART_NO_EMPTY': 0,
      'PART_NO_NOT_IN_MASTER': 0,
      'SOURCE_IS_BUY': 0
    };

    logger.info(this.moduleName, `📊 Processing ${data.length} structure rows`);

    data.forEach((row, index) => {
      // Colonne A : PART NO
      const PART_NO = (row.AZ === 1) ? row.AX : "";
      
      // RÈGLE 1: Exclure si PART_NO est vide
      if (!PART_NO) {
        excludedReasons['PART_NO_EMPTY']++;
        return;
      }
      
      const masterPartData = this.masterIndex.get(PART_NO);
      
      // RÈGLE 2: Excluer si PART_NO n'existe pas dans Master Part ALL
      if (!masterPartData) {
        excludedReasons['PART_NO_NOT_IN_MASTER']++;
        logger.debug(this.moduleName, `❌ PART_NO ${PART_NO} not found in master part index`);
        return;
      }

      // RÈGLE 3: Filtrage des pièces "Buy" - utilisation de la colonne Source du master_part_all.csv
      // Maintenant que master_part_all.csv contient la colonne Source, on peut l'utiliser directement
      if (masterPartData.SOURCE && this.cleanValue(masterPartData.SOURCE).toLowerCase().trim() === "buy") {
        excludedReasons['SOURCE_IS_BUY']++;
        logger.debug(this.moduleName, `❌ PART_NO ${PART_NO} excluded - Source is Buy`);
        return;
      }
      
      // Log pour traçabilité des pièces importantes
      if (PART_NO === "W034679Z") {
        logger.info(this.moduleName, `🔍 Processing critical part W034679Z - Row ${index}, AZ=${row.AZ}, AX=${row.AX}, AY=${row.AY}`);
        logger.info(this.moduleName, `🔍 W034679Z found in master: ${!!masterPartData}, Source: ${masterPartData?.SOURCE || 'NOT_FOUND'}`);
      }

      // Colonne B : PART REV (doit être vide selon les specs)
      const PART_REV = "";

      // Colonne C : SUB PART NO  
      const SUB_PART_NO = this.cleanValue(row["Number"]);

      // Colonne D : SUB PART REV (doit être vide selon les specs)
      const SUB_PART_REV = "";

      // Colonne E : QTY
      const QTY = this.cleanValue(row["Quantity"]);

      // Colonne F : STR COMMENT (toujours vide)
      const STR_COMMENT = "";

      // Colonne G : SORT NO
      const SORT_NO = this.calculateSortNo(results, PART_NO);

      results.push({
        'PART NO': PART_NO,
        'PART REV': PART_REV,
        'SUB PART NO': SUB_PART_NO,
        'SUB PART REV': SUB_PART_REV,
        'QTY': QTY,
        'STR COMMENT': STR_COMMENT,
        'SORT NO': SORT_NO
      });

      // Log spécial pour W034679Z
      if (PART_NO === "W034679Z") {
        logger.info(this.moduleName, `✅ W034679Z added to results - SUB_PART_NO: ${SUB_PART_NO}, QTY: ${QTY}`);
      }
    });

    // Rapport détaillé des exclusions
    logger.info(this.moduleName, `📊 Exclusion Summary:`);
    logger.info(this.moduleName, `   - PART_NO empty: ${excludedReasons['PART_NO_EMPTY']} rows (normal avec algorithme AZ)`);
    logger.info(this.moduleName, `   - PART_NO not in master: ${excludedReasons['PART_NO_NOT_IN_MASTER']} rows`);
    logger.info(this.moduleName, `   - Source is Buy: ${excludedReasons['SOURCE_IS_BUY']} rows`);
    logger.info(this.moduleName, `   - Total excluded: ${data.length - results.length} rows`);
    logger.info(this.moduleName, `   - Final results: ${results.length} rows`);
    
    // Message informatif sur le comportement normal
    const emptyPartNoCount = results.filter(r => !r['PART NO'] || r['PART NO'].trim() === '').length;
    if (emptyPartNoCount > 0) {
      logger.info(this.moduleName, `✅ Algorithme AX/AY/AZ: ${emptyPartNoCount} lignes avec PART NO vide par design (AZ ≠ 1)`);
    }

    // Comptage spécial pour W034679Z
    const w034679ZCount = results.filter(r => r['PART NO'] === 'W034679Z').length;
    logger.info(this.moduleName, `🔍 W034679Z final count: ${w034679ZCount} rows`);

    return results;
  }



  /**
   * Calcul de SUB PART REV avec mapping inverse
   */
  private computeSubPartRev(partNo: string, version: string, state: string): string {
    // Si PART NO est vide → SUB PART REV reste vide
    if (!partNo) return "";

    // Si la pièce est "Released", on prend la version actuelle du BOM
    if (state.toLowerCase().trim() === "released") {
      return version.trim();
    }

    // Sinon on décrémente la lettre (mapping inverse)
    const decrementMapping: Record<string, string> = {
      "I": "H", "H": "G", "G": "F", "F": "E", 
      "E": "D", "D": "C", "C": "B", "B": "A", "A": "A"
    };
    
    return decrementMapping[version.trim()] || version.trim();
  }

  /**
   * Calcul du SORT NO basé sur le nombre d'occurrences
   */
  private calculateSortNo(results: EngStructureRow[], partNo: string): number {
    let count = 0;
    for (const row of results) {
      if (row['PART NO'] === partNo) {
        count++;
      }
    }
    const totalCount = count + 1;
    return totalCount * 10; // Multiplié par 10
  }

  /**
   * Génération du fichier CSV de sortie
   */
  protected async generateOutput(data: EngStructureRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'PART NO' as keyof EngStructureRow, title: 'PART NO' },
      { id: 'PART REV' as keyof EngStructureRow, title: 'PART REV' },
      { id: 'SUB PART NO' as keyof EngStructureRow, title: 'SUB PART NO' },
      { id: 'SUB PART REV' as keyof EngStructureRow, title: 'SUB PART REV' },
      { id: 'QTY' as keyof EngStructureRow, title: 'QTY' },
      { id: 'STR COMMENT' as keyof EngStructureRow, title: 'STR COMMENT' },
      { id: 'SORT NO' as keyof EngStructureRow, title: 'SORT NO' }
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie
   */
  protected validateOutput(data: EngStructureRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Vérification que toutes les lignes ont un PART NO
    const missingPartNo = data.filter(row => !row['PART NO']);
    if (missingPartNo.length > 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `${missingPartNo.length} rows missing PART NO`
      });
    }

    // Vérification que toutes les lignes ont un SUB PART NO
    const missingSubPartNo = data.filter(row => !row['SUB PART NO']);
    if (missingSubPartNo.length > 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `${missingSubPartNo.length} rows missing SUB PART NO`
      });
    }

    // Vérification des SORT NO (doivent être multiples de 10)
    const invalidSortNo = data.filter(row => row['SORT NO'] % 10 !== 0);
    if (invalidSortNo.length > 0) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: `${invalidSortNo.length} rows with SORT NO not multiple of 10`
      });
    }

    // Vérification de la cohérence parent-enfant (adaptée à l'algorithme AX/AY/AZ)
    const parentParts = new Set(data.map(row => row['PART NO']).filter(part => part && part.trim() !== ''));
    const childParts = new Set(data.map(row => row['SUB PART NO']).filter(part => part && part.trim() !== ''));
    
    // Compter les lignes avec PART NO vide (par design de l'algorithme AZ === 1)
    const emptyParentRows = data.filter(row => !row['PART NO'] || row['PART NO'].trim() === '').length;
    
    // Les pièces enfants qui ne sont jamais parents sont des PIÈCES FEUILLES - c'est normal !
    const leafParts = Array.from(childParts).filter(child => !parentParts.has(child));
    
    // Dans une nomenclature hiérarchique, avoir des pièces feuilles est attendu et normal
    // Ces pièces représentent les composants élémentaires (visserie, matériaux, etc.)
    // On ne génère plus d'avertissement pour cela
    logger.info(this.moduleName, `✅ Structure nomenclature normale:`);
    logger.info(this.moduleName, `   - ${parentParts.size} pièces parents (assemblages)`);
    logger.info(this.moduleName, `   - ${leafParts.length} pièces feuilles (composants élémentaires)`);
    logger.info(this.moduleName, `   - ${Array.from(childParts).filter(child => parentParts.has(child)).length} pièces intermédiaires (sous-assemblages)`);
    
    // NOTE: Les "child parts without parent" ne constituent plus un avertissement car :
    // 1. C'est le comportement normal d'une nomenclature (pièces feuilles)
    // 2. Tous les enfants ont bien un parent dans leurs lignes respectives (colonne PART NO)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
