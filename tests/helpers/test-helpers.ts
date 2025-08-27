import * as path from 'path';
import * as fs from 'fs';
import { InputRow } from '../../src/lib/types';
import { readExcelFile } from '../../src/lib/utils/excel';

/**
 * Utilitaires pour les tests
 */
export class TestHelpers {
  static readonly TEST_FILE_PATH = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
  static readonly OUTPUT_DIR = path.join(process.cwd(), 'output');
  static readonly TMP_DIR = path.join(process.cwd(), 'tmp');

  /**
   * Charge et parse le fichier CSV de test en utilisant les utilitaires Excel du projet
   * Note: Le fichier est en format CSV mais nous utilisons readExcelFile pour la compatibilité
   */
  static async loadTestCSV(): Promise<InputRow[]> {
    if (!fs.existsSync(this.TEST_FILE_PATH)) {
      throw new Error(`Fichier de test introuvable : ${this.TEST_FILE_PATH}`);
    }

    try {
      // Essayons d'abord de lire comme Excel (si le fichier était vraiment Excel)
      // Sinon, nous parserons manuellement
      const csvContent = fs.readFileSync(this.TEST_FILE_PATH, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Fichier CSV invalide : pas assez de lignes');
      }

      // Parse header - format complexe avec guillemets doubles
      const headerLine = lines[0];
      const headers = this.parseComplexCSVLine(headerLine);
      const rows: InputRow[] = [];

      // Parse chaque ligne de données
      for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Limite à 1000 lignes pour les tests
        const line = lines[i].trim();
        if (!line) continue;

        const values = this.parseComplexCSVLine(line);
        
        if (values.length !== headers.length) {
          console.warn(`Ligne ${i + 1}: nombre de colonnes incorrect (${values.length} vs ${headers.length})`);
          continue;
        }

        const row: any = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j] || '';
        }
        
        // Mapping des colonnes importantes pour les tests
        if (row['""Number""']) {
          row['Number'] = row['""Number""'].replace(/"/g, '');
        }
        if (row['""Source""']) {
          row['Source'] = row['""Source""'].replace(/"/g, '');
        }
        if (row['""State""']) {
          row['State'] = row['""State""'].replace(/"/g, '');
        }
        if (row['""Classification""']) {
          row['Classification'] = row['""Classification""'].replace(/"/g, '');
        }
        if (row['""Revision""']) {
          row['Version'] = row['""Revision""'].replace(/"/g, '');
        }
        if (row['""Context""']) {
          row['Context'] = row['""Context""'].replace(/"/g, '');
        }
        if (row['""Phantom Manufacturing Part""']) {
          row['Phantom Manufacturing Part'] = row['""Phantom Manufacturing Part""'].replace(/"/g, '');
        }

        rows.push(row as InputRow);
      }

      console.log(`✅ Chargé ${rows.length} lignes de test depuis ${path.basename(this.TEST_FILE_PATH)}`);
      return rows;
    } catch (error) {
      console.error('Erreur lors du chargement du fichier de test:', error);
      throw error;
    }
  }

  /**
   * Parse une ligne CSV complexe avec guillemets doubles échappés
   */
  private static parseComplexCSVLine(line: string): string[] {
    // Pour ce format particulier, nous devons gérer les guillemets doubles
    // Simplifions en utilisant une regex pour séparer sur les virgules hors guillemets
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && nextChar === '"') {
        // Guillemet double échappé
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Last value
    
    return values.map(v => v.trim());
  }

  /**
   * Nettoie les dossiers de sortie avant les tests
   */
  static cleanupDirectories(): void {
    [this.OUTPUT_DIR, this.TMP_DIR].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  /**
   * Vérifie qu'un fichier CSV a été créé et contient des données
   */
  static validateCSVOutput(filePath: string, expectedMinLines: number = 1): boolean {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier de sortie manquant : ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < expectedMinLines + 1) { // +1 pour le header
      throw new Error(`Fichier ${filePath} contient ${lines.length} lignes, attendu au moins ${expectedMinLines + 1}`);
    }

    return true;
  }

  /**
   * Compte les lignes dans un fichier CSV (sans le header)
   */
  static countCSVLines(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return Math.max(0, lines.length - 1); // -1 pour exclure le header
  }

  /**
   * Lit et parse les headers d'un fichier CSV
   */
  static readCSVHeaders(filePath: string): string[] {
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0];
    
    if (!firstLine) return [];
    
    // Parse les headers en gérant les délimiteurs
    return firstLine.split(';').map(header => header.trim().replace(/"/g, ''));
  }

  /**
   * Génère un rapport de test
   */
  static generateTestReport(results: Array<{module: string, success: boolean, outputFile?: string, lines?: number, errors?: string[]}>): string {
    const report = [];
    report.push('');
    report.push('='.repeat(60));
    report.push('📊 RAPPORT DE TEST DU SYSTÈME DE MIGRATION');
    report.push('='.repeat(60));
    report.push(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
    report.push(`📁 Fichier d'entrée: ${path.basename(this.TEST_FILE_PATH)}`);
    report.push('');

    let totalSuccess = 0;
    let totalModules = results.length;

    results.forEach(result => {
      const status = result.success ? '✅ SUCCÈS' : '❌ ÉCHEC';
      report.push(`${status} ${result.module}`);
      
      if (result.outputFile && result.lines !== undefined) {
        report.push(`   📄 Fichier: ${path.basename(result.outputFile)}`);
        report.push(`   📊 Lignes: ${result.lines}`);
      }
      
      if (result.errors && result.errors.length > 0) {
        report.push(`   ❗ Erreurs:`);
        result.errors.forEach(error => report.push(`      • ${error}`));
      }
      
      if (result.success) totalSuccess++;
      report.push('');
    });

    report.push('-'.repeat(60));
    report.push(`🎯 RÉSULTAT GLOBAL: ${totalSuccess}/${totalModules} modules réussis`);
    
    if (totalSuccess === totalModules) {
      report.push('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
    } else {
      report.push('⚠️  Certains tests ont échoué - vérifiez les erreurs ci-dessus');
    }
    report.push('-'.repeat(60));
    report.push('');

    return report.join('\n');
  }
}

/**
 * Matcher Jest personnalisé pour les fichiers CSV
 */
export function expectCSVFile(filePath: string) {
  return {
    toExist() {
      expect(fs.existsSync(filePath)).toBe(true);
      return this;
    },
    toHaveMinLines(minLines: number) {
      const lines = TestHelpers.countCSVLines(filePath);
      expect(lines).toBeGreaterThanOrEqual(minLines);
      return this;
    },
    toHaveHeaders(expectedHeaders: string[]) {
      const headers = TestHelpers.readCSVHeaders(filePath);
      expect(headers).toEqual(expectedHeaders);
      return this;
    }
  };
}
