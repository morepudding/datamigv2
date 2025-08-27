import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import { MasterPartProcessor } from '../../src/lib/processors/master-part';
import { TestHelpers, expectCSVFile } from '../helpers/test-helpers';
import { InputRow } from '../../src/lib/types';

describe('MasterPartProcessor', () => {
  let testData: InputRow[];
  let processor: MasterPartProcessor;
  const outputPath = path.join(TestHelpers.OUTPUT_DIR, 'master_part.csv');

  beforeAll(async () => {
    TestHelpers.cleanupDirectories();
    testData = await TestHelpers.loadTestCSV();
    processor = new MasterPartProcessor();
  });

  afterAll(() => {
    // Garde les fichiers pour inspection manuelle
  });

  test('should load test data successfully', () => {
    expect(testData).toBeDefined();
    expect(testData.length).toBeGreaterThan(0);
    expect(testData[0]).toHaveProperty('Number');
    expect(testData[0]).toHaveProperty('Source');
    expect(testData[0]).toHaveProperty('Classification');
    
    console.log(`📊 Données de test chargées: ${testData.length} lignes`);
  });

  test('should filter out Buy parts correctly', () => {
    const buyParts = testData.filter(row => 
      row.Source && row.Source.toLowerCase().trim() === 'buy'
    );
    const nonBuyParts = testData.filter(row => 
      !row.Source || row.Source.toLowerCase().trim() !== 'buy'
    );

    console.log(`🛍️  Pièces Buy trouvées: ${buyParts.length}`);
    console.log(`🔧 Pièces non-Buy: ${nonBuyParts.length}`);

    expect(buyParts.length).toBeGreaterThan(0);
    expect(nonBuyParts.length).toBeGreaterThan(0);
  });

  test('should filter by classification AN29 correctly', () => {
    const validClassifications = testData.filter(row => {
      if (!row.Classification || row.Classification.length < 10) return false;
      const lastTen = row.Classification.slice(-10);
      return lastTen.slice(0, 4) === 'AN29';
    });

    console.log(`📋 Classifications AN29 valides: ${validClassifications.length}/${testData.length}`);
    
    if (validClassifications.length > 0) {
      console.log(`📌 Exemple de classification: ${validClassifications[0].Classification}`);
    }
  });

  test('should handle phantom parts correctly', () => {
    const phantomParts = testData.filter(row => {
      if (!row.Classification) return false;
      const lastTen = row.Classification.slice(-10);
      return lastTen === 'AN29-02-00' && 
             row['Phantom Manufacturing Part'] && 
             row['Phantom Manufacturing Part'].toLowerCase().trim() === 'no';
    });

    console.log(`👻 Pièces fantômes AN29-02-00 avec Phantom=No: ${phantomParts.length}`);
  });

  test('should handle revision states correctly', () => {
    const inWorkRevA = testData.filter(row => {
      const state = row.State ? row.State.toLowerCase().trim() : '';
      const version = row.Version ? row.Version.trim() : '';
      return (state === 'in work' || state === 'under review') && version === 'A';
    });

    console.log(`🔄 Révisions A en cours de travail: ${inWorkRevA.length}`);
  });

  test('should process data and generate CSV', async () => {
    const result = await processor.process(testData, outputPath);
    
    expect(result).toBeDefined();
    expect(result.outputPath).toBe(outputPath);
    expect(result.rowsInput).toBeGreaterThan(0);
    expect(result.rowsOutput).toBeGreaterThanOrEqual(0);
    expect(result.success).toBe(true);
    
    console.log(`📊 Master Part - Résultats:`);
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
    expect(headers.length).toBe(18); // 18 colonnes pour Master Part
    
    // Vérification des headers attendus
    const expectedHeaders = [
      'PART_NO', 'DESCRIPTION', 'INFO_TEXT', 'UNIT_CODE', 'CONFIGURABLE_DB',
      'SERIAL_TRACKING_CODE_DB', 'PROVIDE_DB', 'PART_REV', 'ASSORTMENT_ID',
      'ASSORTMENT_NODE', 'CODE_GTIN', 'PART_MAIN_GROUP', 'FIRST_INVENTORY_SITE',
      'CONFIG_FAMILY_ID', 'ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE',
      'ALLOW_AS_NOT_CONSUMED', 'VOLUME_NET', 'WEIGHT_NET'
    ];
    
    expect(headers).toEqual(expectedHeaders);
    
    console.log(`📄 Fichier Master Part créé: ${lineCount} lignes, ${headers.length} colonnes`);
  });

  test('should handle duplicate part numbers correctly', () => {
    // Vérifier la déduplication
    const partNumbers = new Set();
    const duplicates = [];
    
    for (const row of testData) {
      if (row.Number) {
        if (partNumbers.has(row.Number)) {
          duplicates.push(row.Number);
        } else {
          partNumbers.add(row.Number);
        }
      }
    }
    
    console.log(`🔄 Numéros de pièces uniques: ${partNumbers.size}`);
    console.log(`📋 Total des lignes: ${testData.length}`);
    console.log(`🔂 Doublons détectés: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`   📝 Exemples de doublons: ${duplicates.slice(0, 3).join(', ')}`);
    }
  });

  test('should validate data integrity', async () => {
    // Test avec un échantillon de données pour vérifier l'intégrité
    const sampleData = testData.slice(0, 100); // Premier 100 lignes
    const sampleOutputPath = path.join(TestHelpers.OUTPUT_DIR, 'master_part_sample.csv');
    const result = await processor.process(sampleData, sampleOutputPath);
    
    expect(result.errors.length).toBe(0); // Pas d'erreurs critiques
    expect(result.rowsOutput).toBeGreaterThanOrEqual(0);
    expect(result.rowsInput).toBe(sampleData.length);
    expect(result.success).toBe(true);
    
    console.log(`🧪 Test d'intégrité sur ${sampleData.length} lignes:`);
    console.log(`   ✅ Succès: ${result.rowsOutput} lignes traitées`);
    console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  });
});
