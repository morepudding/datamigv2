// Classe de base abstraite pour tous les processeurs de migration
import { InputRow, ProcessingResult, ValidationResult } from '../types/migration';
import logger from '../utils/logger';

export abstract class BaseProcessor {
  protected moduleName: string;
  protected inputData: InputRow[] = [];
  protected outputData: any[] = [];

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Méthode principale de traitement
   */
  async process(inputData: InputRow[], outputPath: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const endTimer = logger.time(this.moduleName, `Processing ${inputData.length} rows`);

    try {
      this.inputData = inputData;
      
      // Validation des données d'entrée
      const validation = this.validateInput(inputData);
      if (!validation.isValid) {
        throw new Error(`Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Traitement spécifique au module
      this.outputData = await this.processData(inputData);

      // Génération du fichier de sortie
      await this.generateOutput(this.outputData, outputPath);

      // Validation des données de sortie
      const outputValidation = this.validateOutput(this.outputData);
      
      endTimer();

      return {
        success: true,
        module: this.moduleName,
        rowsInput: inputData.length,
        rowsOutput: this.outputData.length,
        outputPath,
        processingTime: Date.now() - startTime,
        errors: [],
        warnings: outputValidation.warnings.map(w => w.message)
      };

    } catch (error) {
      endTimer();
      
      logger.error(this.moduleName, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        module: this.moduleName,
        rowsInput: inputData.length,
        rowsOutput: 0,
        outputPath,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Validation des données d'entrée - à implémenter par chaque module
   */
  protected abstract validateInput(data: InputRow[]): ValidationResult;

  /**
   * Traitement des données - logique métier spécifique à chaque module
   */
  protected abstract processData(data: InputRow[]): Promise<any[]> | any[];

  /**
   * Génération du fichier de sortie - à implémenter par chaque module
   */
  protected abstract generateOutput(data: any[], outputPath: string): Promise<void>;

  /**
   * Validation des données de sortie - à implémenter par chaque module
   */
  protected abstract validateOutput(data: any[]): ValidationResult;

  /**
   * Filtre les données selon le champ Source
   */
  protected filterBySource(data: InputRow[], excludeBuy: boolean = true): InputRow[] {
    if (!excludeBuy) {
      return data;
    }

    const filtered = data.filter(row => {
      const source = (row.Source || '').toString().toLowerCase().trim();
      return source !== 'buy';
    });

    logger.info(this.moduleName, `Source filter: ${data.length} → ${filtered.length} rows (excluded ${data.length - filtered.length} 'Buy' items)`);
    return filtered;
  }

  /**
   * Déduplique les données selon une clé
   */
  protected deduplicateByKey<T>(data: T[], keyExtractor: (item: T) => string): T[] {
    const seen = new Set<string>();
    const deduplicated = data.filter(item => {
      const key = keyExtractor(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    logger.info(this.moduleName, `Deduplication: ${data.length} → ${deduplicated.length} rows (removed ${data.length - deduplicated.length} duplicates)`);
    return deduplicated;
  }

  /**
   * Nettoie une valeur de cellule
   */
  protected cleanValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return value.toString().trim();
  }

  /**
   * Calcule une révision selon la logique métier
   */
  protected computeRevision(version: string, state: string): string {
    const versionMapping: Record<string, string> = {
      'F': 'E', 'E': 'D', 'D': 'C', 'C': 'B', 'B': 'A', 'A': 'A'
    };

    const cleanState = state.toLowerCase().trim();
    const cleanVersion = version.trim();

    if (cleanState === 'released') {
      return cleanVersion;
    }

    if ((cleanState === 'in work' || cleanState === 'under review') && versionMapping[cleanVersion]) {
      return versionMapping[cleanVersion];
    }

    return cleanVersion;
  }

  /**
   * Extrait le code projet depuis le contexte
   */
  protected extractProjectCode(context: string): string {
    if (!context || context.length < 5) {
      return '';
    }

    const code = context.substring(0, 5);
    return /^[A-Z0-9]{5}$/.test(code) ? code : '';
  }

  /**
   * Vérifie si une classification contient un pattern
   */
  protected hasClassificationPattern(classification: string, pattern: string): boolean {
    return Boolean(classification && classification.includes(pattern));
  }

  /**
   * Extrait l'ASSORTMENT_NODE depuis la classification
   */
  protected extractAssortmentNode(classification: string): string {
    if (!classification) return '';
    
    const match = classification.match(/AN\d{2}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }

  /**
   * Retourne les statistiques de traitement
   */
  getProcessingStats(): { inputRows: number; outputRows: number; filteringRate: number } {
    const inputRows = this.inputData.length;
    const outputRows = this.outputData.length;
    const filteringRate = inputRows > 0 ? ((inputRows - outputRows) / inputRows) * 100 : 0;

    return { inputRows, outputRows, filteringRate };
  }
}
