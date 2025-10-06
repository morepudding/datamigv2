// Script de debug pour eng-structure
import path from 'path';
import fs from 'fs';
import { EngStructureProcessor } from './src/lib/processors/eng-structure';
import { MasterPartAllProcessor } from './src/lib/processors/master-part-all';
import { readCSV } from './src/lib/utils/csv';

async function debug() {
  const inputFile = path.join(process.cwd(), 'JY5MB_complete_boat_20250929_1630CEST (1).csv');
  const outputDir = path.join(process.cwd(), 'output');
  const masterPartAllFile = path.join(outputDir, 'master_part_all.csv');
  const outputFile = path.join(outputDir, '02_L_ENG_PART_STRUCT_JY5MB_WOOD.csv');

  console.log('📋 Lecture du fichier d\'entrée...');
  const inputData = await readCSV(inputFile);
  console.log(`✅ ${inputData.length} lignes lues`);
  
  console.log('\n🔍 Premières colonnes du fichier:');
  console.log(Object.keys(inputData[0]).slice(0, 15).join(', '));
  
  console.log('\n🔍 Recherche de "Structure Level" ou "tructure Level":');
  const structureKey = Object.keys(inputData[0]).find(key => 
    key.includes('tructure Level') || key.includes('Structure Level')
  );
  console.log(`   Trouvée: "${structureKey}"`);
  
  // Régénérer master_part_all.csv
  console.log('\n� Génération de master_part_all.csv...');
  const masterProcessor = new MasterPartAllProcessor();
  const masterResult = await masterProcessor.process(inputData, masterPartAllFile);
  console.log(`✅ master_part_all.csv généré: ${masterResult.rowsOutput} lignes`);
  
  // Vérifier les 3 parents
  const masterData = await readCSV(masterPartAllFile);
  console.log('\n🔍 Recherche des 3 parents dans master_part_all:');
  const parents = ['W034624Z', 'W036319Z', 'W065000Z'];
  parents.forEach(parent => {
    const found = masterData.find(row => row.PART_NO === parent);
    console.log(`   ${parent}: ${found ? '✅ TROUVÉ' : '❌ MANQUANT'}`);
  });
  
  console.log('\n�🔄 Traitement avec Eng Structure Processor...');
  const processor = new EngStructureProcessor();
  const result = await processor.process(inputData, outputFile);
  
  console.log('\n📊 RÉSULTATS:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Lignes en entrée: ${result.rowsInput}`);
  console.log(`   Lignes en sortie: ${result.rowsOutput}`);
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ ERREURS:');
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    result.warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  // Lire le fichier de sortie
  if (fs.existsSync(outputFile)) {
    const content = fs.readFileSync(outputFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    console.log(`\n📄 Fichier de sortie: ${lines.length} lignes (incluant header)`);
    
    // Chercher les 3 parents
    console.log('\n🔍 Recherche des 3 parents dans Eng Part Structure:');
    parents.forEach(parent => {
      const foundLines = lines.filter(l => l.startsWith(parent));
      console.log(`   ${parent}: ${foundLines.length} lignes`);
    });
  }
}

debug().catch(console.error);
