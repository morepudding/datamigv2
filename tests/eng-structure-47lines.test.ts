/**
 * TEST DE VALIDATION: 47 lignes Eng Part Structure
 * 
 * Vérifie que le processeur Eng Structure génère exactement les 47 lignes attendues
 * pour les 3 pièces parents: W034624Z, W036319Z, W065000Z
 */

import { describe, test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import { EngStructureProcessor } from '../src/lib/processors/eng-structure';
import { readCSV } from '../src/lib/utils/csv';

describe('🎯 Eng Structure - Test des 47 lignes attendues', () => {
  const inputFile = path.join(process.cwd(), 'JY5MB_complete_boat_20250929_1630CEST (1).csv');
  const expectedLinesFile = path.join(process.cwd(), 'lignesmanquantes.csv');
  const outputDir = path.join(process.cwd(), 'output');
  const outputFile = path.join(outputDir, '02_L_ENG_PART_STRUCT_JY5MB_WOOD.csv');

  test('📊 Doit générer exactement 47 lignes', async () => {
    console.log('\n📋 Démarrage du test de validation des 47 lignes...\n');

    // Vérifier que le fichier d'entrée existe
    expect(fs.existsSync(inputFile)).toBe(true);
    console.log(`✅ Fichier d'entrée trouvé: ${path.basename(inputFile)}`);

    // Vérifier que le fichier de référence existe
    expect(fs.existsSync(expectedLinesFile)).toBe(true);
    console.log(`✅ Fichier de référence trouvé: ${path.basename(expectedLinesFile)}`);

    // Lire les données d'entrée
    const inputData = await readCSV(inputFile);
    console.log(`📊 ${inputData.length} lignes lues du fichier source`);

    // S'assurer que le dossier output existe et que master_part_all.csv existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Vérifier que master_part_all.csv existe (prérequis)
    const masterPartAllFile = path.join(outputDir, 'master_part_all.csv');
    if (!fs.existsSync(masterPartAllFile)) {
      console.warn('⚠️ master_part_all.csv manquant, génération nécessaire en amont');
      
      // Générer master_part_all.csv (prérequis)
      const { MasterPartAllProcessor } = require('../src/lib/processors/master-part-all');
      const masterPartAllProcessor = new MasterPartAllProcessor();
      await masterPartAllProcessor.process(inputData, masterPartAllFile);
      console.log(`✅ master_part_all.csv généré`);
    }

    // Traitement avec Eng Structure Processor
    console.log('\n🔄 Traitement Eng Part Structure...');
    
    const processor = new EngStructureProcessor();
    const result = await processor.process(inputData, outputFile);

    console.log(`\n📊 RÉSULTATS DU TRAITEMENT:`);
    console.log(`   - Lignes en entrée: ${result.rowsInput}`);
    console.log(`   - Lignes générées: ${result.rowsOutput}`);
    console.log(`   - Succès: ${result.success}`);
    
    // Afficher les erreurs et warnings
    if (!result.success) {
      console.error('\n❌ ÉCHEC DU TRAITEMENT');
    }
    if (result.errors && result.errors.length > 0) {
      console.error('   ERREURS:', JSON.stringify(result.errors, null, 2));
    }
    if (result.warnings && result.warnings.length > 0) {
      console.warn('   WARNINGS:', JSON.stringify(result.warnings, null, 2));
    }

    // Lire les lignes de référence attendues
    const expectedLines = await readCSV(expectedLinesFile);
    console.log(`\n📋 Lignes attendues dans lignesmanquantes.csv: ${expectedLines.length}`);

    // Lire le fichier généré pour compter les lignes des 3 parents
    expect(fs.existsSync(outputFile)).toBe(true);
    const generatedLines = await readCSV(outputFile);
    
    const parentsAttendus = ['W034624Z', 'W036319Z', 'W065000Z'];
    const lignesDesParents = generatedLines.filter(row => {
      const partNo = row['PART NO'] || row['PART_NO'] || '';
      return parentsAttendus.includes(partNo);
    });

    // TEST PRINCIPAL: Vérifier qu'on a exactement 47 lignes pour les 3 parents
    console.log(`\n🎯 VALIDATION:`);
    console.log(`   Total de lignes générées: ${result.rowsOutput}`);
    console.log(`   Lignes des 3 parents attendues: 47`);
    console.log(`   Lignes des 3 parents obtenues: ${lignesDesParents.length}`);
    
    expect(lignesDesParents.length).toBe(47);

    if (lignesDesParents.length === 47) {
      console.log(`\n✅ ✅ ✅ TEST RÉUSSI! Exactement 47 lignes générées pour les 3 parents! ✅ ✅ ✅\n`);
    } else {
      console.log(`\n❌ ❌ ❌ TEST ÉCHOUÉ! ${lignesDesParents.length} lignes au lieu de 47! ❌ ❌ ❌\n`);
      console.log(`   Différence: ${lignesDesParents.length - 47 > 0 ? '+' : ''}${lignesDesParents.length - 47} lignes`);
    }

    // Vérifier le contenu généré
    console.log(`\n📄 Fichier généré analysé:`);
    console.log(`   - Chemin: ${outputFile}`);
    console.log(`   - Total lignes: ${generatedLines.length}`);
    console.log(`   - Lignes des 3 parents: ${lignesDesParents.length}`);

      // Vérifier les 3 pièces parents attendues
      const parentsGenerés = new Set(generatedLines.map(l => l['PART NO']?.trim()));
      
      console.log(`\n🔍 Vérification des pièces parents:`);
      parentsAttendus.forEach(parent => {
        const found = parentsGenerés.has(parent) || parentsGenerés.has(parent.replace(/\s/g, ''));
        console.log(`   ${found ? '✅' : '❌'} ${parent}: ${found ? 'TROUVÉ' : 'MANQUANT'}`);
      });

      // Afficher un échantillon des lignes générées
      console.log(`\n📋 Échantillon des lignes générées (premières 5):`);
      generatedLines.slice(0, 5).forEach((line, i) => {
        console.log(`   ${i + 1}. ${line['PART NO']} → ${line['SUB PART NO']} (qty: ${line['QTY']})`);
      });
    }

  }, 30000); // Timeout de 30 secondes

  test('📝 Les 3 pièces parents doivent être présentes', async () => {
    const outputData = await readCSV(outputFile);
    const parentsAttendus = ['W034624Z', 'W036319Z', 'W065000Z'];
    
    parentsAttendus.forEach(parent => {
      const found = outputData.some(line => {
        const partNo = line['PART NO']?.trim().replace(/\s/g, '');
        return partNo === parent.replace(/\s/g, '');
      });
      expect(found).toBe(true);
    });
  });

  test('📊 Répartition des lignes par parent', async () => {
    const outputData = await readCSV(outputFile);
    const expectedLines = await readCSV(expectedLinesFile);
    
    // Compter les lignes par parent dans le fichier attendu
    const expectedCounts: { [key: string]: number } = {};
    expectedLines.forEach(line => {
      const parent = line['PART_NO']?.trim().replace(/\s/g, '');
      expectedCounts[parent] = (expectedCounts[parent] || 0) + 1;
    });

    console.log(`\n📊 Répartition attendue:`);
    Object.entries(expectedCounts).forEach(([parent, count]) => {
      console.log(`   ${parent}: ${count} enfants`);
    });

    // Compter les lignes par parent dans le fichier généré
    const actualCounts: { [key: string]: number } = {};
    outputData.forEach(line => {
      const parent = line['PART NO']?.trim().replace(/\s/g, '');
      actualCounts[parent] = (actualCounts[parent] || 0) + 1;
    });

    console.log(`\n📊 Répartition obtenue:`);
    Object.entries(actualCounts).forEach(([parent, count]) => {
      const expected = expectedCounts[parent] || 0;
      const match = count === expected ? '✅' : '❌';
      console.log(`   ${match} ${parent}: ${count} enfants (attendu: ${expected})`);
    });

    // Vérifier chaque parent
    Object.entries(expectedCounts).forEach(([parent, expectedCount]) => {
      const actualCount = actualCounts[parent] || 0;
      expect(actualCount).toBe(expectedCount);
    });
  });
});
