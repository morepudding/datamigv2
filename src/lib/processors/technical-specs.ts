/**
 * MODULE 3: TECHNICAL SPEC VALUES
 * Migre les attributs techniques des pièces vers le système IFS
 * 
 * Prérequis obligatoires:
 * 1. Le fichier master_part.csv (filtré) DOIT exister dans le dossier output
 * 2. Le fichier X_attributs.csv DOIT être présent dans le dossier extractors
 * 3. Filtrage initial : Source ≠ "Buy" (identique aux autres modules)
 */

import { BaseProcessor } from './base-processor';
import { InputRow, ValidationResult, ValidationError, ValidationWarning } from '../types/migration';
import { generateCSV } from '../utils/csv';
import { readCSV } from '../utils/csv';
import logger from '../utils/logger';
import * as path from 'path';

interface TechnicalSpecRow {
  'MASTER_PART': string;
  'ATTRIBUT': string;
  'VALEUR': string;
  'TYPE': string;
}

interface AttributeMapping {
  [key: string]: {
    name: string;
    type: 'A' | 'N'; // 'A' (Alphanumeric) ou 'N' (Numeric)
  };
}

export class TechnicalSpecsProcessor extends BaseProcessor {
  private attributeMapping: AttributeMapping = {};
  private masterPartData: any[] = [];

  constructor() {
    super('Technical Spec Values');
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
    const requiredColumns = ['Number', 'Source'];
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
   * Traitement principal avec chargement des fichiers de dépendance
   */
  protected async processData(data: InputRow[]): Promise<TechnicalSpecRow[]> {
    logger.info(this.moduleName, `Starting processing with ${data.length} input rows`);

    // Étape 1: Chargement du mapping d'attributs depuis X_attributs.csv
    await this.loadAttributeMapping();
    logger.info(this.moduleName, `Loaded ${Object.keys(this.attributeMapping).length} attribute mappings`);

    // Étape 2: Chargement du fichier master_part.csv
    await this.loadMasterPartData();
    logger.info(this.moduleName, `Loaded ${this.masterPartData.length} master part records`);

    // Étape 3: Filtrage initial (Source ≠ "Buy")
    let filteredData = this.filterBySource(data, true);
    logger.info(this.moduleName, `After Source filter: ${filteredData.length} rows`);

    // Étape 4: Filtrage par existence dans Master Part
    filteredData = this.filterByMasterPartExistence(filteredData);
    logger.info(this.moduleName, `After Master Part existence filter: ${filteredData.length} rows`);

    // Étape 5: Génération des valeurs d'attributs
    const results = this.generateAttributeValues(filteredData);
    logger.info(this.moduleName, `Generated ${results.length} attribute values (with duplicates)`);

    // Étape 6: Déduplication des résultats
    const uniqueResults = this.deduplicateResults(results);
    logger.info(this.moduleName, `Final results after deduplication: ${uniqueResults.length} rows`);

    return uniqueResults;
  }

  /**
   * Chargement et indexation du mapping d'attributs depuis X_attributs.csv
   */
  private async loadAttributeMapping(): Promise<void> {
    try {
      // Chemin compatible Vercel et local
      const extractorsPath = path.join(process.cwd(), 'public', 'extractors', 'X_attributs.csv');
      
      logger.info(this.moduleName, `Loading attribute mapping from: ${extractorsPath}`);
      
      let attributeData: any[];
      
      try {
        attributeData = await readCSV(extractorsPath);
      } catch (error) {
        // Fallback : mapping intégré si fichier introuvable
        logger.warn(this.moduleName, 'X_attributs.csv not found, using embedded mapping');
        attributeData = [
          { PLM: 'Marque', IFS: 'BRAND', TYPE: 'A' },
          { PLM: 'Matière', IFS: 'MATERIAL', TYPE: 'A' },
          { PLM: 'Masse', IFS: 'WEIGHT', TYPE: 'N' },
          { PLM: 'Thickness', IFS: 'PANEL THICKNESS', TYPE: 'N' },
          { PLM: 'Largeur sens du fil', IFS: 'GRAIN DIR WIDTH', TYPE: 'N' },
          { PLM: 'Longueur sens du fil', IFS: 'GRAIN DIR LGTH', TYPE: 'N' },
          { PLM: 'Working length', IFS: 'OVERALL LENGTH', TYPE: 'N' },
          { PLM: 'Surface', IFS: 'SURFACE', TYPE: 'N' },
          { PLM: 'Edge banding length', IFS: 'EDGE LENGTH', TYPE: 'N' },
          { PLM: 'Edge banding thickness', IFS: 'EDGE THICKN', TYPE: 'N' },
          { PLM: 'Edge banding wood type', IFS: 'EDGE MATERIAL', TYPE: 'A' },
          { PLM: 'Edge banding width', IFS: 'EDGE WIDTH', TYPE: 'N' },
          { PLM: 'Largeur', IFS: 'WIDTH VNR SHEET', TYPE: 'N' },
          { PLM: 'Longueur', IFS: 'LNGH VENEER SHT', TYPE: 'N' },
          { PLM: 'Profile', IFS: 'PROFILE CODE', TYPE: 'A' }
        ];
      }
      
      this.attributeMapping = {};
      
      attributeData.forEach(row => {
        if (row['PLM'] && row['IFS'] && row['TYPE']) {
          this.attributeMapping[row['PLM']] = {
            name: row['IFS'],
            type: row['TYPE'] as 'A' | 'N'
          };
        }
      });

      if (Object.keys(this.attributeMapping).length === 0) {
        throw new Error('No valid attribute mappings found in X_attributs.csv');
      }
    } catch (error) {
      throw new Error(`Failed to load attribute mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chargement du fichier master_part.csv depuis le dossier output
   */
  private async loadMasterPartData(): Promise<void> {
    try {
      const masterPartPath = path.join(process.cwd(), 'output', 'master_part.csv');
      this.masterPartData = await readCSV(masterPartPath);
      
      if (this.masterPartData.length === 0) {
        throw new Error('Master Part file is empty or not found');
      }
    } catch (error) {
      throw new Error(`Failed to load master part data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filtrage par existence dans Master Part
   */
  private filterByMasterPartExistence(data: InputRow[]): InputRow[] {
    const masterPartNumbers = new Set(this.masterPartData.map(mp => mp['PART_NO']));
    
    const filtered = data.filter(row => {
      const partNumber = this.cleanValue(row.Number);
      return masterPartNumbers.has(partNumber);
    });

    logger.info(this.moduleName, `Master Part existence filter: ${data.length} → ${filtered.length} rows`);
    return filtered;
  }

  /**
   * Génération des valeurs d'attributs avec nettoyage
   */
  private generateAttributeValues(data: InputRow[]): TechnicalSpecRow[] {
    const results: TechnicalSpecRow[] = [];

    data.forEach(row => {
      const partNumber = this.cleanValue(row.Number);
      
      // Pour chaque attribut mappé
      Object.keys(this.attributeMapping).forEach(attribute => {
        if (row[attribute] !== undefined && row[attribute] !== null) {
          // 1) Conversion en chaîne
          let cleanValue = String(row[attribute]);

          // 2) Suppression des unités physiques
          cleanValue = cleanValue.replace(/m²|m|deg|kg/g, "").trim();

          // 3) Suppression des exposants mathématiques
          cleanValue = cleanValue.replace(/\*\*\d+/g, "").trim();

          // 4) Inclusion conditionnelle (exclure les valeurs vides)
          if (cleanValue !== "") {
            results.push({
              'MASTER_PART': partNumber,
              'ATTRIBUT': this.attributeMapping[attribute].name,
              'VALEUR': cleanValue,
              'TYPE': this.attributeMapping[attribute].type
            });
          }
        }
      });
    });

    return results;
  }

  /**
   * Déduplication des résultats basée sur la clé composite
   */
  private deduplicateResults(results: TechnicalSpecRow[]): TechnicalSpecRow[] {
    const uniqueMap = new Map<string, TechnicalSpecRow>();
    
    results.forEach(item => {
      const key = `${item.MASTER_PART}-${item.ATTRIBUT}-${item.VALEUR}-${item.TYPE}`;
      uniqueMap.set(key, item);
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * Génération du fichier CSV de sortie
   */
  protected async generateOutput(data: TechnicalSpecRow[], outputPath: string): Promise<void> {
    const headers = [
      { id: 'MASTER_PART' as keyof TechnicalSpecRow, title: 'MASTER_PART' },
      { id: 'ATTRIBUT' as keyof TechnicalSpecRow, title: 'ATTRIBUT' },
      { id: 'VALEUR' as keyof TechnicalSpecRow, title: 'VALEUR' },
      { id: 'TYPE' as keyof TechnicalSpecRow, title: 'TYPE' }
    ];

    await generateCSV(data, headers, outputPath);
    logger.info(this.moduleName, `Generated CSV with ${data.length} rows at ${outputPath}`);
  }

  /**
   * Validation des données de sortie
   */
  protected validateOutput(data: TechnicalSpecRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Vérification que toutes les lignes ont les champs obligatoires
    const missingMasterPart = data.filter(row => !row.MASTER_PART);
    if (missingMasterPart.length > 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `${missingMasterPart.length} rows missing MASTER_PART`
      });
    }

    const missingAttribut = data.filter(row => !row.ATTRIBUT);
    if (missingAttribut.length > 0) {
      errors.push({
        type: 'MISSING_COLUMN',
        message: `${missingAttribut.length} rows missing ATTRIBUT`
      });
    }

    // Vérification des types d'attributs
    const invalidTypes = data.filter(row => row.TYPE !== 'A' && row.TYPE !== 'N');
    if (invalidTypes.length > 0) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        message: `${invalidTypes.length} rows with invalid TYPE (should be A or N)`
      });
    }

    // Vérification de la déduplication
    const keys = data.map(row => `${row.MASTER_PART}-${row.ATTRIBUT}-${row.VALEUR}-${row.TYPE}`);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      warnings.push({
        type: 'DATA_QUALITY',
        message: 'Duplicate entries detected after deduplication'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
