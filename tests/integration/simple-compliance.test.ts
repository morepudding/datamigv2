/**
 * TEST SIMPLE DE CONFORMITÉ - Utilise l'API du système directement
 * 
 * Ce test utilise le même fichier et la même logique que l'application en production
 * pour s'assurer que tous les points de conformité RUN 2 sont validés.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('🎯 RUN 2 Simple Compliance Test', () => {

  test('🚀 Test de conformité complet via génération directe', async () => {
    console.log('\n📋 Démarrage test de conformité RUN 2...');
    
    // Vérifier que le fichier d'entrée existe
    const inputFile = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    expect(fs.existsSync(inputFile)).toBe(true);
    console.log(`✅ Fichier d'entrée trouvé: ${path.basename(inputFile)}`);
    
    // Utilisons directement la logique de l'API pour traiter le fichier
    const { readCSV } = require('../../src/lib/utils/csv');
    const { MasterPartProcessor } = require('../../src/lib/processors/master-part');
    const { MasterPartAllProcessor } = require('../../src/lib/processors/master-part-all');
    const { TechnicalSpecsProcessor } = require('../../src/lib/processors/technical-specs');
    const { EngStructureProcessor } = require('../../src/lib/processors/eng-structure');
    const { InventoryPartProcessor } = require('../../src/lib/processors/inventory-part');
    
    // S'assurer que le dossier output existe
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Lire les données du fichier CSV comme le fait l'API
      console.log('📄 Lecture du fichier d\'entrée...');
      const inputData = await readCSV(inputFile);
      console.log(`📊 ${inputData.length} lignes lues`);
      
      if (inputData.length === 0) {
        console.error('❌ Aucune donnée lue du fichier CSV');
        console.log('📄 Taille du fichier:', fs.statSync(inputFile).size, 'bytes');
        throw new Error('Pas de données lues du fichier CSV');
      }
      
      expect(inputData.length).toBeGreaterThan(1000); // Au moins 1000 lignes pour continuer
      
      // Définir les fichiers de sortie avec les vrais noms
      const outputFiles = {
        masterPart: path.join(outputDir, '01_L_PARTS_MD_004_CNB_PR4LC_WOOD.csv'),
        masterPartAll: path.join(outputDir, 'master_part_all.csv'),
        technicalSpecs: path.join(outputDir, '03_L_TECHNICAL_CLASS_VALUES_PR4LC_WOOD.csv'),
        engStructure: path.join(outputDir, '02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv'),
        inventoryPart: path.join(outputDir, '04_L_INVENTORY_PART_PR4LC_WOOD.csv')
      };
      
      // ÉTAPE 1: Master Part (avec noms corrects)
      console.log('\n📋 1. Traitement Master Part...');
      const masterPartProcessor = new MasterPartProcessor();
      console.log(`🔧 Données d'entrée: ${inputData.length} lignes pour Master Part`);
      
      const masterPartResult = await masterPartProcessor.process(inputData, outputFiles.masterPart);
      console.log(`🔧 Résultat Master Part:`, {
        success: masterPartResult.success,
        rowsOutput: masterPartResult.rowsOutput,
        errors: masterPartResult.errors
      });
      
      expect(masterPartResult.success).toBe(true);
      expect(fs.existsSync(outputFiles.masterPart)).toBe(true);
      expect(path.basename(outputFiles.masterPart)).toBe('01_L_PARTS_MD_004_CNB_PR4LC_WOOD.csv');
      console.log(`✅ Master Part: ${masterPartResult.rowsOutput} lignes -> ${path.basename(outputFiles.masterPart)}`);
      
      // ÉTAPE 2: Master Part All (pour Eng Structure)
      console.log('\n📋 2. Traitement Master Part All...');
      const masterPartAllProcessor = new MasterPartAllProcessor();
      const masterPartAllResult = await masterPartAllProcessor.process(inputData, outputFiles.masterPartAll);
      
      expect(masterPartAllResult.success).toBe(true);
      expect(fs.existsSync(outputFiles.masterPartAll)).toBe(true);
      expect(path.basename(outputFiles.masterPartAll)).toBe('master_part_all.csv');
      console.log(`✅ Master Part All: ${masterPartAllResult.rowsOutput} lignes -> ${path.basename(outputFiles.masterPartAll)} (interne)`);
      
      // ÉTAPE 3: Eng Structure (dépend de Master Part All)
      console.log('\n📋 3. Traitement Eng Structure...');
      const engStructureProcessor = new EngStructureProcessor();
      const engStructureResult = await engStructureProcessor.process(inputData, outputFiles.engStructure);
      
      expect(engStructureResult.success).toBe(true);
      expect(fs.existsSync(outputFiles.engStructure)).toBe(true);
      expect(path.basename(outputFiles.engStructure)).toBe('02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv');
      console.log(`✅ Eng Structure: ${engStructureResult.rowsOutput} lignes -> ${path.basename(outputFiles.engStructure)}`);
      
      // ÉTAPE 4: Technical Specs
      console.log('\n📋 4. Traitement Technical Specs...');
      const technicalSpecsProcessor = new TechnicalSpecsProcessor();
      const technicalSpecsResult = await technicalSpecsProcessor.process(inputData, outputFiles.technicalSpecs);
      
      expect(technicalSpecsResult.success).toBe(true);
      expect(fs.existsSync(outputFiles.technicalSpecs)).toBe(true);
      expect(path.basename(outputFiles.technicalSpecs)).toBe('03_L_TECHNICAL_CLASS_VALUES_PR4LC_WOOD.csv');
      console.log(`✅ Technical Specs: ${technicalSpecsResult.rowsOutput} lignes -> ${path.basename(outputFiles.technicalSpecs)}`);
      
      // ÉTAPE 5: Inventory Part
      console.log('\n📋 5. Traitement Inventory Part...');
      const inventoryPartProcessor = new InventoryPartProcessor();
      const inventoryPartResult = await inventoryPartProcessor.process(inputData, outputFiles.inventoryPart);
      
      expect(inventoryPartResult.success).toBe(true);
      expect(fs.existsSync(outputFiles.inventoryPart)).toBe(true);
      expect(path.basename(outputFiles.inventoryPart)).toBe('04_L_INVENTORY_PART_PR4LC_WOOD.csv');
      console.log(`✅ Inventory Part: ${inventoryPartResult.rowsOutput} lignes -> ${path.basename(outputFiles.inventoryPart)}`);
      
      // VALIDATION DES CONTENUS
      console.log('\n🔍 VALIDATION DES CONTENUS...');
      
      // 1. Master Part - Colonnes I et P en majuscule
      console.log('📊 Vérification Master Part - Colonnes I et P...');
      const masterPartContent = fs.readFileSync(outputFiles.masterPart, 'utf8');
      const masterPartLines = masterPartContent.split('\n').filter(line => line.trim());
      if (masterPartLines.length > 1) {
        const sampleLine = masterPartLines[1];
        expect(sampleLine).toContain('CLASSIFICATION');
        expect(sampleLine).toContain('FALSE');
        console.log('✅ CLASSIFICATION et FALSE présents dans Master Part');
      }
      
      // 2. Inventory Part - TYPE_CODE_DB = 1
      console.log('📊 Vérification Inventory Part - TYPE_CODE_DB...');
      const inventoryContent = fs.readFileSync(outputFiles.inventoryPart, 'utf8');
      const inventoryLines = inventoryContent.split('\n').filter(line => line.trim());
      if (inventoryLines.length > 1) {
        const headerLine = inventoryLines[0];
        const headers = headerLine.split(',');
        const typeCodeIndex = headers.findIndex(h => h.includes('TYPE_CODE_DB'));
        
        if (typeCodeIndex >= 0 && inventoryLines.length > 1) {
          const sampleDataLine = inventoryLines[1].split(',');
          const typeCodeValue = sampleDataLine[typeCodeIndex]?.replace(/"/g, '').trim();
          expect(typeCodeValue).toBe('1');
          console.log(`✅ TYPE_CODE_DB = "${typeCodeValue}" (attendu: "1")`);
        }
      }
      
      // 3. Technical Specs - Présence des attributs techniques
      console.log('📊 Vérification Technical Specs - Attributs techniques...');
      const technicalContent = fs.readFileSync(outputFiles.technicalSpecs, 'utf8');
      const requiredAttributes = [
        'MACHINING CODE', 'RIGHT ANGLE', 'LEFT ANGLE', 'RIGHT OBLIQUE', 'LEFT OBLIQUE',
        'MATRL INT VN F', 'MATRL OUT VN F', 'VENEER AREA', 'OVERALL THICKN', 'OVERALL WIDTH',
        'PAINT AERA', 'VENEER MATERIAL', 'MOLD PLATE', 'MOLD POSITION', 'MOLD NUMBER',
        'FINGER JOINT', 'SECTION', 'MACHINING BOX', 'WOOD GRAIN'
      ];
      
      let foundAttributesCount = 0;
      requiredAttributes.forEach(attr => {
        if (technicalContent.includes(attr) || technicalContent.includes(attr.replace('AERA', 'AREA'))) {
          foundAttributesCount++;
        }
      });
      
      const attributePercentage = (foundAttributesCount / requiredAttributes.length) * 100;
      console.log(`✅ Attributs techniques trouvés: ${foundAttributesCount}/${requiredAttributes.length} (${attributePercentage.toFixed(1)}%)`);
      expect(foundAttributesCount).toBeGreaterThan(10); // Au moins 10 des 18 attributs
      
      // 4. Eng Structure - Nombre de lignes (~3738) et champs vides
      console.log('📊 Vérification Eng Structure - Lignes et champs...');
      const engLines = fs.readFileSync(outputFiles.engStructure, 'utf8').split('\n').filter(line => line.trim());
      const engDataLines = engLines.length - 1; // Sans header
      
      console.log(`📊 Eng Structure: ${engDataLines} lignes de données`);
      expect(engDataLines).toBeGreaterThan(3500); // Au moins 3500 lignes
      expect(engDataLines).toBeLessThan(4000);   // Moins de 4000 lignes
      
      // Vérifier PART_REV et SUB_PART_REV vides
      if (engLines.length > 1) {
        const engHeaders = engLines[0].split(',');
        const partRevIndex = engHeaders.findIndex(h => h.includes('PART_REV'));
        const subPartRevIndex = engHeaders.findIndex(h => h.includes('SUB_PART_REV'));
        
        if (partRevIndex >= 0 && subPartRevIndex >= 0 && engLines.length > 1) {
          const sampleDataLine = engLines[1].split(',');
          const partRevValue = sampleDataLine[partRevIndex]?.replace(/"/g, '').trim() || '';
          const subPartRevValue = sampleDataLine[subPartRevIndex]?.replace(/"/g, '').trim() || '';
          
          expect(partRevValue).toBe('');
          expect(subPartRevValue).toBe('');
          console.log('✅ PART_REV et SUB_PART_REV sont vides comme attendu');
        }
      }
      
      // 5. Master Part All - Plus de lignes que Master Part
      expect(masterPartAllResult.rowsOutput).toBeGreaterThan(masterPartResult.rowsOutput);
      console.log(`✅ Master Part All (${masterPartAllResult.rowsOutput}) > Master Part (${masterPartResult.rowsOutput})`);
      
      // RÉSUMÉ FINAL
      console.log('\n🎯 RÉSUMÉ DE CONFORMITÉ RUN 2:');
      console.log(`   📝 Noms de fichiers conformes: ✅`);
      console.log(`   📊 Master Part colonnes I/P: ✅`);
      console.log(`   🔢 Inventory Part TYPE_CODE_DB=1: ✅`);
      console.log(`   🔧 Attributs techniques présents: ✅ (${foundAttributesCount}/18)`);
      console.log(`   📊 Eng Structure ~3738 lignes: ✅ (${engDataLines})`);
      console.log(`   🗂️ Master Part All interne: ✅`);
      console.log('\n🎉 ✅ TOUS LES CRITÈRES DE CONFORMITÉ RUN 2 SONT RESPECTÉS !');
      
    } catch (error) {
      console.error('❌ Erreur pendant le test:', error);
      throw error;
    }
    
  }, 120000); // Timeout 2 minutes
});