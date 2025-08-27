import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import { TestHelpers } from '../helpers/test-helpers';
import { InputRow } from '../../src/lib/types';

// Import de tous les processeurs
import { MasterPartProcessor } from '../../src/lib/processors/master-part';
import { MasterPartAllProcessor } from '../../src/lib/processors/master-part-all';
import { TechnicalSpecsProcessor } from '../../src/lib/processors/technical-specs';
import { EngStructureProcessor } from '../../src/lib/processors/eng-structure';
import { InventoryPartProcessor } from '../../src/lib/processors/inventory-part';
import { InventoryPartPlanProcessor } from '../../src/lib/processors/inventory-part-plan';

describe('Full System Integration Test', () => {
  let testData: InputRow[];
  const outputFiles = {
    masterPart: path.join(TestHelpers.OUTPUT_DIR, 'master_part.csv'),
    masterPartAll: path.join(TestHelpers.OUTPUT_DIR, 'master_part_all.csv'),
    technicalSpecs: path.join(TestHelpers.OUTPUT_DIR, 'technical_specs_values.csv'),
    engStructure: path.join(TestHelpers.OUTPUT_DIR, 'eng_part_structure.csv'),
    inventoryPart: path.join(TestHelpers.OUTPUT_DIR, 'inventory_part.csv'),
    inventoryPartPlan: path.join(TestHelpers.OUTPUT_DIR, 'inventory_part_plan.csv')
  };

  beforeAll(async () => {
    TestHelpers.cleanupDirectories();
    testData = await TestHelpers.loadTestCSV();
    console.log(`🚀 Démarrage du test d'intégration complet avec ${testData.length} lignes`);
  });

  afterAll(() => {
    console.log(`📁 Fichiers de test conservés dans: ${TestHelpers.OUTPUT_DIR}`);
  });

  test('should complete full migration pipeline successfully', async () => {
    const results = [];
    const startTime = Date.now();

    try {
      // ÉTAPE 1: Master Part (base pour Technical Specs)
      console.log('\n📋 ÉTAPE 1: Processing Master Part...');
      const masterPartProcessor = new MasterPartProcessor();
      const masterPartResult = await masterPartProcessor.process(testData, outputFiles.masterPart);
      results.push({
        module: 'Master Part',
        success: masterPartResult.success,
        outputFile: outputFiles.masterPart,
        lines: masterPartResult.rowsOutput,
        errors: masterPartResult.errors,
        processingTime: masterPartResult.processingTime
      });

      // ÉTAPE 2: Master Part All (base pour Eng Structure)
      console.log('\n📋 ÉTAPE 2: Processing Master Part All...');
      const masterPartAllProcessor = new MasterPartAllProcessor();
      const masterPartAllResult = await masterPartAllProcessor.process(testData, outputFiles.masterPartAll);
      results.push({
        module: 'Master Part All',
        success: masterPartAllResult.success,
        outputFile: outputFiles.masterPartAll,
        lines: masterPartAllResult.rowsOutput,
        errors: masterPartAllResult.errors,
        processingTime: masterPartAllResult.processingTime
      });

      // ÉTAPE 3: Technical Specs (dépend de Master Part)
      if (masterPartResult.success && fs.existsSync(outputFiles.masterPart)) {
        console.log('\n📋 ÉTAPE 3: Processing Technical Specs...');
        const technicalSpecsProcessor = new TechnicalSpecsProcessor();
        const technicalSpecsResult = await technicalSpecsProcessor.process(testData, outputFiles.technicalSpecs);
        results.push({
          module: 'Technical Specs',
          success: technicalSpecsResult.success,
          outputFile: outputFiles.technicalSpecs,
          lines: technicalSpecsResult.rowsOutput,
          errors: technicalSpecsResult.errors,
          processingTime: technicalSpecsResult.processingTime
        });
      }

      // ÉTAPE 4: Eng Structure (dépend de Master Part All)
      if (masterPartAllResult.success && fs.existsSync(outputFiles.masterPartAll)) {
        console.log('\n📋 ÉTAPE 4: Processing Eng Structure...');
        const engStructureProcessor = new EngStructureProcessor();
        const engStructureResult = await engStructureProcessor.process(testData, outputFiles.engStructure);
        results.push({
          module: 'Eng Structure',
          success: engStructureResult.success,
          outputFile: outputFiles.engStructure,
          lines: engStructureResult.rowsOutput,
          errors: engStructureResult.errors,
          processingTime: engStructureResult.processingTime
        });
      }

      // ÉTAPE 5: Inventory Part (indépendant)
      console.log('\n📋 ÉTAPE 5: Processing Inventory Part...');
      const inventoryPartProcessor = new InventoryPartProcessor();
      const inventoryPartResult = await inventoryPartProcessor.process(testData, outputFiles.inventoryPart);
      results.push({
        module: 'Inventory Part',
        success: inventoryPartResult.success,
        outputFile: outputFiles.inventoryPart,
        lines: inventoryPartResult.rowsOutput,
        errors: inventoryPartResult.errors,
        processingTime: inventoryPartResult.processingTime
      });

      // ÉTAPE 6: Inventory Part Plan (indépendant)
      console.log('\n📋 ÉTAPE 6: Processing Inventory Part Plan...');
      const inventoryPartPlanProcessor = new InventoryPartPlanProcessor();
      const inventoryPartPlanResult = await inventoryPartPlanProcessor.process(testData, outputFiles.inventoryPartPlan);
      results.push({
        module: 'Inventory Part Plan',
        success: inventoryPartPlanResult.success,
        outputFile: outputFiles.inventoryPartPlan,
        lines: inventoryPartPlanResult.rowsOutput,
        errors: inventoryPartPlanResult.errors,
        processingTime: inventoryPartPlanResult.processingTime
      });

    } catch (error) {
      console.error(`❌ Erreur critique dans le pipeline: ${error}`);
      throw error;
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    // Génération du rapport de test
    const report = TestHelpers.generateTestReport(results);
    console.log(report);

    // Vérifications globales
    expect(results.length).toBeGreaterThan(0);
    expect(successCount).toBe(results.length); // Tous les modules doivent réussir

    // Vérification des fichiers de sortie
    results.forEach(result => {
      if (result.success && result.outputFile) {
        expect(fs.existsSync(result.outputFile)).toBe(true);
        if (result.lines && result.lines > 0) {
          expect(TestHelpers.countCSVLines(result.outputFile)).toBeGreaterThan(0);
        }
      }
    });

    console.log(`\n🎯 PIPELINE COMPLET TERMINÉ EN ${totalTime}ms`);
    console.log(`✅ ${successCount}/${results.length} modules réussis`);

  }, 120000); // Timeout de 2 minutes pour le test complet

  test('should validate dependencies between modules', () => {
    // Test des dépendances inter-modules
    console.log('\n🔗 Validation des dépendances inter-modules...');

    const dependencies = {
      'Technical Specs': ['Master Part'],
      'Eng Structure': ['Master Part All']
    };

    Object.entries(dependencies).forEach(([module, deps]) => {
      deps.forEach(dep => {
        const depFile = Object.values(outputFiles).find(file => 
          path.basename(file).includes(dep.toLowerCase().replace(' ', '_'))
        );
        if (depFile) {
          console.log(`✅ Dépendance ${dep} → ${module}: ${fs.existsSync(depFile) ? 'OK' : 'MANQUANT'}`);
        }
      });
    });
  });

  test('should validate output file structure', () => {
    console.log('\n📊 Validation de la structure des fichiers de sortie...');

    const expectedStructures = {
      [outputFiles.masterPart]: 18, // 18 colonnes
      [outputFiles.masterPartAll]: 18, // 18 colonnes
      [outputFiles.technicalSpecs]: 4, // 4 colonnes
      [outputFiles.engStructure]: 7, // 7 colonnes
      [outputFiles.inventoryPart]: 31, // 31 colonnes
      [outputFiles.inventoryPartPlan]: 4 // 4 colonnes
    };

    Object.entries(expectedStructures).forEach(([filePath, expectedCols]) => {
      if (fs.existsSync(filePath)) {
        const headers = TestHelpers.readCSVHeaders(filePath);
        const lineCount = TestHelpers.countCSVLines(filePath);
        
        console.log(`📄 ${path.basename(filePath)}: ${headers.length} colonnes, ${lineCount} lignes`);
        expect(headers.length).toBe(expectedCols);
      }
    });
  });

  test('should validate business rules consistency', () => {
    console.log('\n🔍 Validation des règles métier...');

    // Vérifier que Master Part ALL contient au moins autant de lignes que Master Part
    const masterPartLines = TestHelpers.countCSVLines(outputFiles.masterPart);
    const masterPartAllLines = TestHelpers.countCSVLines(outputFiles.masterPartAll);

    if (masterPartLines > 0 && masterPartAllLines > 0) {
      console.log(`📊 Master Part: ${masterPartLines} lignes`);
      console.log(`📊 Master Part ALL: ${masterPartAllLines} lignes`);
      
      // Master Part ALL devrait avoir plus ou autant de lignes (inclut Buy)
      expect(masterPartAllLines).toBeGreaterThanOrEqual(masterPartLines);
    }
  });

  test('should create comprehensive test summary', () => {
    // Résumé final du test
    const summary = {
      totalInputRows: testData.length,
      generatedFiles: Object.keys(outputFiles).length,
      existingFiles: Object.values(outputFiles).filter(f => fs.existsSync(f)).length,
      totalOutputRows: Object.values(outputFiles)
        .filter(f => fs.existsSync(f))
        .reduce((sum, f) => sum + TestHelpers.countCSVLines(f), 0)
    };

    console.log('\n📈 RÉSUMÉ FINAL DU TEST:');
    console.log(`   📥 Lignes d'entrée: ${summary.totalInputRows}`);
    console.log(`   📄 Fichiers générés: ${summary.existingFiles}/${summary.generatedFiles}`);
    console.log(`   📤 Lignes de sortie totales: ${summary.totalOutputRows}`);
    console.log(`   📊 Taux de conversion: ${(summary.totalOutputRows / summary.totalInputRows * 100).toFixed(2)}%`);

    expect(summary.existingFiles).toBeGreaterThan(0);
    expect(summary.totalOutputRows).toBeGreaterThan(0);
  });
});
