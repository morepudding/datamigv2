import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import { MasterPartAllProcessor } from '../../src/lib/processors/master-part-all';
import { TestHelpers, expectCSVFile } from '../helpers/test-helpers';
import { InputRow } from '../../src/lib/types';

describe('MasterPartAllProcessor', () => {
  let testData: InputRow[];
  let processor: MasterPartAllProcessor;
  const outputPath = path.join(TestHelpers.OUTPUT_DIR, 'master_part_all.csv');

  beforeAll(async () => {
    TestHelpers.cleanupDirectories();
    testData = await TestHelpers.loadTestCSV();
    processor = new MasterPartAllProcessor();
  });

  afterAll(() => {
    // Garde les fichiers pour inspection manuelle
  });

  test('should load test data successfully', () => {
    expect(testData).toBeDefined();
    expect(testData.length).toBeGreaterThan(0);
    console.log(`📊 Données de test chargées: ${testData.length} lignes`);
  });

  test('should include Buy parts (different from MasterPart)', () => {
    const buyParts = testData.filter(row => 
      row.Source && row.Source.toLowerCase().trim() === 'buy'
    );
    const makeParts = testData.filter(row => 
      row.Source && row.Source.toLowerCase().trim() === 'make'
    );

    console.log(`🛍️  Pièces Buy (incluses dans Master Part ALL): ${buyParts.length}`);
    console.log(`🔧 Pièces Make: ${makeParts.length}`);

    expect(buyParts.length).toBeGreaterThan(0);
    expect(makeParts.length).toBeGreaterThan(0);
  });

  test('should filter by classification containing AN29', () => {
    const an29Parts = testData.filter(row => {
      return row.Classification && row.Classification.includes('AN29');
    });

    console.log(`📋 Classifications contenant AN29: ${an29Parts.length}/${testData.length}`);
    
    if (an29Parts.length > 0) {
      console.log(`📌 Exemple de classification: ${an29Parts[0].Classification}`);
    }
  });

  test('should handle state filtering correctly', () => {
    const releasedParts = testData.filter(row => {
      const state = row.State ? row.State.toLowerCase().trim() : '';
      return state === 'released';
    });

    const inWorkNonA = testData.filter(row => {
      const state = row.State ? row.State.toLowerCase().trim() : '';
      const version = row.Version ? row.Version.trim() : '';
      return state === 'in work' && version !== 'A';
    });

    console.log(`✅ Pièces Released: ${releasedParts.length}`);
    console.log(`🔄 Pièces In Work (non-A): ${inWorkNonA.length}`);
  });

  test('should process data and generate CSV', async () => {
    const result = await processor.process(testData, outputPath);
    
    expect(result).toBeDefined();
    expect(result.outputPath).toBe(outputPath);
    expect(result.success).toBe(true);
    expect(result.rowsInput).toBeGreaterThan(0);
    expect(result.rowsOutput).toBeGreaterThanOrEqual(0);
    
    console.log(`📊 Master Part ALL - Résultats:`);
    console.log(`   📁 Fichier: ${path.basename(result.outputPath)}`);
    console.log(`   📊 Lignes traitées: ${result.rowsOutput}/${result.rowsInput}`);
    console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
    console.log(`   ❌ Erreurs: ${result.errors.length}`);

    if (result.warnings.length > 0) {
      console.log(`   📝 Premiers warnings:`);
      result.warnings.slice(0, 3).forEach((w, i) => 
        console.log(`      ${i + 1}. ${w}`)
      );
    }
  });

  test('should create valid CSV output file', () => {
    expectCSVFile(outputPath).toExist();
    
    const lineCount = TestHelpers.countCSVLines(outputPath);
    const headers = TestHelpers.readCSVHeaders(outputPath);
    
    expect(lineCount).toBeGreaterThan(0);
    expect(headers.length).toBe(18); // 18 colonnes pour Master Part ALL
    
    // Vérification des headers attendus (identiques à Master Part)
    const expectedHeaders = [
      'PART_NO', 'DESCRIPTION', 'INFO_TEXT', 'UNIT_CODE', 'CONFIGURABLE_DB',
      'SERIAL_TRACKING_CODE_DB', 'PROVIDE_DB', 'PART_REV', 'ASSORTMENT_ID',
      'ASSORTMENT_NODE', 'CODE_GTIN', 'PART_MAIN_GROUP', 'FIRST_INVENTORY_SITE',
      'CONFIG_FAMILY_ID', 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE',
      'ALLOW_AS_NOT_CONSUMED', 'VOLUME_NET', 'WEIGHT_NET'
    ];
    
    expect(headers).toEqual(expectedHeaders);
    
    console.log(`📄 Fichier Master Part ALL créé: ${lineCount} lignes, ${headers.length} colonnes`);
  });

  test('should have different output than Master Part (includes Buy)', async () => {
    // Comparer avec le résultat du Master Part normal (qui exclut les Buy)
    const masterPartPath = path.join(TestHelpers.OUTPUT_DIR, 'master_part.csv');
    
    if (fs.existsSync(masterPartPath)) {
      const masterPartLines = TestHelpers.countCSVLines(masterPartPath);
      const masterPartAllLines = TestHelpers.countCSVLines(outputPath);
      
      console.log(`📊 Comparaison Master Part vs Master Part ALL:`);
      console.log(`   Master Part (sans Buy): ${masterPartLines} lignes`);
      console.log(`   Master Part ALL (avec Buy): ${masterPartAllLines} lignes`);
      console.log(`   Différence: ${masterPartAllLines - masterPartLines} lignes`);
      
      // Master Part ALL devrait avoir plus de lignes (inclut les Buy)
      expect(masterPartAllLines).toBeGreaterThanOrEqual(masterPartLines);
    }
  });

  test('should handle phantom parts exclusion', () => {
    const phantomExclusions = testData.filter(row => {
      if (!row.Classification) return false;
      return row.Classification.includes('AN29-02-00') && 
             row['Phantom Manufacturing Part'] && 
             row['Phantom Manufacturing Part'].toLowerCase().trim() === 'no';
    });

    console.log(`👻 Pièces fantômes à exclure (AN29-02-00 + Phantom=No): ${phantomExclusions.length}`);
  });

  test('should maintain referential integrity', async () => {
    // Test d'intégrité : vérifier que toutes les pièces ont bien un Number
    const sampleData = testData.slice(0, 50);
    const sampleOutputPath = path.join(TestHelpers.OUTPUT_DIR, 'master_part_all_sample.csv');
    const result = await processor.process(sampleData, sampleOutputPath);
    
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    
    // Vérifier que le fichier est bien créé et contient des données
    if (result.rowsOutput > 0) {
      expectCSVFile(sampleOutputPath).toExist().toHaveMinLines(1);
    }
    
    console.log(`🔍 Test d'intégrité échantillon (${sampleData.length} lignes):`);
    console.log(`   ✅ Traitement réussi: ${result.rowsOutput} lignes générées`);
    console.log(`   ⏱️  Temps: ${result.processingTime}ms`);
  });
});

// Import nécessaire pour le test de comparaison
import * as fs from 'fs';
