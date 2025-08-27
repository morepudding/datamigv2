import * as path from 'path';
import * as fs from 'fs';
import { readExcelFile, getExcelFileInfo } from '../../src/lib/utils/excel';

/**
 * Helper pour les tests métier - utilise les vrais utilitaires du projet
 */
export class BusinessTestHelper {
  static readonly TEST_FILE_PATH = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
  static readonly OUTPUT_DIR = path.join(process.cwd(), 'output');
  static readonly TMP_DIR = path.join(process.cwd(), 'tmp');

  /**
   * Charge le fichier de test en utilisant l'utilitaire Excel du projet
   */
  static async loadTestData(): Promise<any[]> {
    if (!fs.existsSync(this.TEST_FILE_PATH)) {
      throw new Error(`Fichier de test introuvable : ${this.TEST_FILE_PATH}`);
    }

    try {
      // Lecture directe du CSV pour analyser sa structure
      const csvContent = fs.readFileSync(this.TEST_FILE_PATH, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      console.log(`📄 Fichier CSV: ${lines.length} lignes brutes`);
      console.log(`🔍 Première ligne: ${lines[0].substring(0, 100)}...`);
      
      // Parse manuelle du CSV avec gestion des guillemets doubles
      const data = this.parseCustomCSV(csvContent);
      
      console.log(`✅ Chargé ${data.length} lignes depuis ${path.basename(this.TEST_FILE_PATH)}`);
      console.log(`📊 Colonnes détectées: ${Object.keys(data[0] || {}).length}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement: ${error}`);
      throw error;
    }
  }

  /**
   * Parser CSV personnalisé pour gérer les formats complexes
   */
  static parseCustomCSV(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // Parse de la première ligne d'en-têtes
    const headerLine = lines[0];
    let headers: string[] = [];
    
    // Extraction des en-têtes avec gestion des guillemets doubles
    const headerMatches = headerLine.match(/"([^"]+)"/g);
    if (headerMatches) {
      headers = headerMatches.map(h => h.replace(/^"|"$/g, ''));
    } else {
      // Fallback simple si pas de guillemets
      headers = headerLine.split(',');
    }
    
    console.log(`📋 En-têtes détectées: ${headers.length}`);
    console.log(`📋 Premiers en-têtes: ${headers.slice(0, 5).join(', ')}`);
    
    // Parse des lignes de données
    const data: any[] = [];
    for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Augmentons à 1000 lignes pour les tests
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse de la ligne avec gestion des guillemets
      const values = this.parseCSVLine(line);
      
      // Création de l'objet ligne
      const rowObj: any = {};
      for (let j = 0; j < headers.length && j < values.length; j++) {
        rowObj[headers[j]] = values[j] || '';
      }
      
      data.push(rowObj);
    }
    
    console.log(`🔧 Données parsées: ${data.length} lignes`);
    
    return data;
  }

  /**
   * Parse une ligne CSV avec gestion des guillemets doubles
   */
  static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    const matches = line.match(/"([^"]*)"/g);
    
    if (matches) {
      return matches.map(match => match.replace(/^"|"$/g, ''));
    } else {
      // Fallback pour format simple
      return line.split(',').map(v => v.trim());
    }
  }

  /**
   * Nettoie les dossiers de test
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
   * Vérifie les règles métier Master Part selon la SFD
   */
  static validateMasterPartBusinessRules(data: any[]): {
    totalLines: number;
    afterSourceFilter: number;
    afterClassificationFilter: number;
    afterPhantomFilter: number;
    afterRevisionFilter: number;
    afterDeduplication: number;
    excluded: {
      buyParts: number;
      shortClassifications: number;
      phantomAN29_02_00: number;
      revisionAInWork: number;
      duplicates: number;
    }
  } {
    const stats = {
      totalLines: data.length,
      afterSourceFilter: 0,
      afterClassificationFilter: 0,
      afterPhantomFilter: 0,
      afterRevisionFilter: 0,
      afterDeduplication: 0,
      excluded: {
        buyParts: 0,
        shortClassifications: 0,
        phantomAN29_02_00: 0,
        revisionAInWork: 0,
        duplicates: 0
      }
    };

    let filtered = data;

    // ÉTAPE 1 : Exclusion des pièces d'achat (Source !== "Buy")
    const buyParts = filtered.filter(row => {
      const source = (row.Source || '').toString().toLowerCase().trim();
      return source === 'buy';
    });
    stats.excluded.buyParts = buyParts.length;

    filtered = filtered.filter(row => {
      const source = (row.Source || '').toString().toLowerCase().trim();
      return source !== 'buy';
    });
    stats.afterSourceFilter = filtered.length;

    // ÉTAPE 2 : Filtrage sur classification
    const shortClassifications = filtered.filter(row => {
      const classification = row.Classification || '';
      if (classification.length < 10) return true;
      const lastTen = classification.slice(-10);
      return lastTen.slice(0, 4) !== 'AN29';
    });
    stats.excluded.shortClassifications = shortClassifications.length;

    filtered = filtered.filter(row => {
      const classification = row.Classification || '';
      if (classification.length < 10) return false;
      const lastTen = classification.slice(-10);
      return lastTen.slice(0, 4) === 'AN29';
    });
    stats.afterClassificationFilter = filtered.length;

    // ÉTAPE 3 : Exclusion des pièces fantômes spécifiques
    const phantomExclusions = filtered.filter(row => {
      const classification = row.Classification || '';
      if (classification.length < 10) return false;
      const lastTen = classification.slice(-10);
      const phantom = (row['Phantom Manufacturing Part'] || '').toString().toLowerCase().trim();
      return lastTen === 'AN29-02-00' && phantom === 'no';
    });
    stats.excluded.phantomAN29_02_00 = phantomExclusions.length;

    filtered = filtered.filter(row => {
      const classification = row.Classification || '';
      if (classification.length < 10) return true;
      const lastTen = classification.slice(-10);
      const phantom = (row['Phantom Manufacturing Part'] || '').toString().toLowerCase().trim();
      return !(lastTen === 'AN29-02-00' && phantom === 'no');
    });
    stats.afterPhantomFilter = filtered.length;

    // ÉTAPE 4 : Exclusion des révisions A en cours de travail
    const revisionAInWork = filtered.filter(row => {
      const state = (row.State || '').toString().toLowerCase().trim();
      const revision = (row.Revision || '').toString().trim();
      return (state === 'in work' || state === 'under review') && revision === 'A';
    });
    stats.excluded.revisionAInWork = revisionAInWork.length;

    filtered = filtered.filter(row => {
      const state = (row.State || '').toString().toLowerCase().trim();
      const revision = (row.Revision || '').toString().trim();
      return !((state === 'in work' || state === 'under review') && revision === 'A');
    });
    stats.afterRevisionFilter = filtered.length;

    // ÉTAPE 5 : Déduplication sur colonne "Number"
    const seen = new Set();
    let duplicatesCount = 0;
    const deduplicated = filtered.filter(row => {
      const number = (row.Number || '').toString().trim();
      if (seen.has(number)) {
        duplicatesCount++;
        return false;
      }
      seen.add(number);
      return true;
    });
    stats.excluded.duplicates = duplicatesCount;
    stats.afterDeduplication = deduplicated.length;

    return stats;
  }

  /**
   * Vérifie les règles métier Master Part All selon la SFD
   */
  static validateMasterPartAllBusinessRules(data: any[]): any {
    const stats = {
      totalLines: data.length,
      afterClassificationFilter: 0,
      afterStateFilter: 0,
      afterPhantomFilter: 0,
      afterDeduplication: 0,
      included: {
        buyParts: 0,
        makeParts: 0
      }
    };

    let filtered = data;

    // PAS de filtre sur Source (différence clé avec Master Part)
    const buyParts = filtered.filter(row => {
      const source = (row.Source || '').toString().toLowerCase().trim();
      return source === 'buy';
    });
    const makeParts = filtered.filter(row => {
      const source = (row.Source || '').toString().toLowerCase().trim();
      return source === 'make';
    });
    stats.included.buyParts = buyParts.length;
    stats.included.makeParts = makeParts.length;

    // FILTRAGE : Classification.includes("AN29")
    filtered = filtered.filter(row => {
      const classification = row.Classification || '';
      return classification.includes('AN29');
    });
    stats.afterClassificationFilter = filtered.length;

    // FILTRAGE : État (Released OU In Work non-A)
    filtered = filtered.filter(row => {
      const state = (row.State || '').toString().toLowerCase().trim();
      const revision = (row.Revision || '').toString().trim();
      return state === 'released' || (state === 'in work' && revision !== 'A');
    });
    stats.afterStateFilter = filtered.length;

    // Exclusion des pièces fantômes (même règle que Master Part)
    filtered = filtered.filter(row => {
      const classification = row.Classification || '';
      const phantom = (row['Phantom Manufacturing Part'] || '').toString().toLowerCase().trim();
      return !(classification.includes('AN29-02-00') && phantom === 'no');
    });
    stats.afterPhantomFilter = filtered.length;

    // Déduplication sur "Number"
    const seen = new Set();
    const deduplicated = filtered.filter(row => {
      const number = (row.Number || '').toString().trim();
      if (seen.has(number)) return false;
      seen.add(number);
      return true;
    });
    stats.afterDeduplication = deduplicated.length;

    return stats;
  }

  /**
   * Valide la logique de transformation des révisions
   */
  static validateRevisionLogic(data: any[]): any {
    const versionMapping: Record<string, string> = { F: 'E', E: 'D', D: 'C', C: 'B', B: 'A', A: 'A' };
    const revisionStats = {
      released: { total: 0, unchanged: 0 },
      inWork: { total: 0, decremented: 0, unchanged: 0 },
      underReview: { total: 0, decremented: 0, unchanged: 0 }
    };

    data.forEach(row => {
      const state = (row.State || '').toString().toLowerCase().trim();
      const revision = (row.Revision || '').toString().trim();

      if (state === 'released') {
        revisionStats.released.total++;
        revisionStats.released.unchanged++;
      } else if (state === 'in work' || state === 'under review') {
        const statKey = state === 'in work' ? 'inWork' : 'underReview';
        revisionStats[statKey].total++;
        
        if (versionMapping[revision]) {
          revisionStats[statKey].decremented++;
        } else {
          revisionStats[statKey].unchanged++;
        }
      }
    });

    return revisionStats;
  }

  /**
   * Génère un rapport détaillé de validation métier
   */
  static generateBusinessValidationReport(
    masterPartStats: any,
    masterPartAllStats: any,
    revisionStats: any
  ): string {
    const report = [];
    report.push('');
    report.push('🔍 VALIDATION DES RÈGLES MÉTIER - SYSTÈME PLM vers IFS');
    report.push('='.repeat(65));
    report.push(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
    report.push(`📄 Fichier: JY5MB_complete_boat_20250428_0927CEST(in).csv`);
    report.push('');

    // Master Part
    report.push('1️⃣ MASTER PART - Référentiel Principal (hors achats)');
    report.push('-'.repeat(50));
    report.push(`📊 Données d'entrée: ${masterPartStats.totalLines} lignes`);
    report.push(`🔄 Après filtre Source (≠ Buy): ${masterPartStats.afterSourceFilter} lignes`);
    report.push(`📋 Après filtre Classification: ${masterPartStats.afterClassificationFilter} lignes`);
    report.push(`👻 Après filtre Phantom: ${masterPartStats.afterPhantomFilter} lignes`);
    report.push(`🔄 Après filtre Révision: ${masterPartStats.afterRevisionFilter} lignes`);
    report.push(`🎯 Après déduplication: ${masterPartStats.afterDeduplication} lignes`);
    report.push('');
    report.push('   📉 Exclusions détaillées:');
    report.push(`      🛍️  Pièces Buy: ${masterPartStats.excluded.buyParts}`);
    report.push(`      📏 Classifications courtes/invalides: ${masterPartStats.excluded.shortClassifications}`);
    report.push(`      👻 Pièces fantômes AN29-02-00: ${masterPartStats.excluded.phantomAN29_02_00}`);
    report.push(`      🔄 Révisions A en cours: ${masterPartStats.excluded.revisionAInWork}`);
    report.push(`      🔂 Doublons: ${masterPartStats.excluded.duplicates}`);
    report.push('');

    // Master Part All
    report.push('2️⃣ MASTER PART ALL - Référentiel Complet (inclut achats)');
    report.push('-'.repeat(50));
    report.push(`📊 Données d'entrée: ${masterPartAllStats.totalLines} lignes`);
    report.push(`📋 Après filtre Classification (AN29): ${masterPartAllStats.afterClassificationFilter} lignes`);
    report.push(`🔄 Après filtre État: ${masterPartAllStats.afterStateFilter} lignes`);
    report.push(`👻 Après filtre Phantom: ${masterPartAllStats.afterPhantomFilter} lignes`);
    report.push(`🎯 Après déduplication: ${masterPartAllStats.afterDeduplication} lignes`);
    report.push('');
    report.push('   📈 Inclusions par type:');
    report.push(`      🛍️  Pièces Buy (incluses): ${masterPartAllStats.included.buyParts}`);
    report.push(`      🔧 Pièces Make: ${masterPartAllStats.included.makeParts}`);
    report.push('');

    // Logique des révisions
    report.push('3️⃣ LOGIQUE DE TRANSFORMATION DES RÉVISIONS');
    report.push('-'.repeat(50));
    report.push(`✅ Released (révision inchangée): ${revisionStats.released.total}`);
    report.push(`🔄 In Work - décrément: ${revisionStats.inWork.decremented}, inchangé: ${revisionStats.inWork.unchanged}`);
    report.push(`📋 Under Review - décrément: ${revisionStats.underReview.decremented}, inchangé: ${revisionStats.underReview.unchanged}`);
    report.push('');

    // Comparaison Master Part vs Master Part All
    const difference = masterPartAllStats.afterDeduplication - masterPartStats.afterDeduplication;
    report.push('4️⃣ COMPARAISON MASTER PART vs MASTER PART ALL');
    report.push('-'.repeat(50));
    report.push(`🎯 Master Part (hors Buy): ${masterPartStats.afterDeduplication} lignes`);
    report.push(`🎯 Master Part ALL (avec Buy): ${masterPartAllStats.afterDeduplication} lignes`);
    report.push(`📈 Différence (pièces Buy incluses): ${difference} lignes`);
    report.push('');

    const buyIncludedRate = masterPartAllStats.included.buyParts > 0 ? 
      (difference / masterPartAllStats.included.buyParts * 100).toFixed(1) : '0.0';
    report.push(`📊 Taux d'inclusion des pièces Buy: ${buyIncludedRate}%`);

    // Validations de cohérence
    report.push('');
    report.push('5️⃣ VALIDATIONS DE COHÉRENCE');
    report.push('-'.repeat(50));
    
    const validations = [];
    if (masterPartAllStats.afterDeduplication >= masterPartStats.afterDeduplication) {
      validations.push('✅ Master Part ALL >= Master Part (cohérent)');
    } else {
      validations.push('❌ Master Part ALL < Master Part (incohérent!)');
    }
    
    if (difference <= masterPartAllStats.included.buyParts) {
      validations.push('✅ Différence <= Pièces Buy (cohérent)');
    } else {
      validations.push('❌ Différence > Pièces Buy (incohérent!)');
    }

    validations.forEach(v => report.push(`   ${v}`));

    report.push('');
    report.push('-'.repeat(65));
    report.push('✅ VALIDATION DES RÈGLES MÉTIER TERMINÉE');
    report.push('-'.repeat(65));

    return report.join('\n');
  }
}
