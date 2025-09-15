/**
 * TEST DIRECT DU MODULE ENG_PART_STRUCTURE
 * 
 * Ce script lance uniquement le processeur ENG_PART_STRUCTURE
 * pour voir les avertissements spécifiques à ce module.
 */

const fs = require('fs');
const path = require('path');

async function testEngStructureProcessor() {
  console.log('🔧 TEST DIRECT DU MODULE ENG_PART_STRUCTURE');
  console.log('=============================================');

  try {
    // Importer le module compilé
    const { EngStructureProcessor } = require('./dist/lib/processors/eng-structure');
    
    // Lire les données d'entrée (même logique que le workflow)
    const csvContent = fs.readFileSync('JY5MB_complete_boat_20250428_0927CEST(in).csv', 'utf8');
    const rawLines = csvContent.split('\n');
    
    // Parser le CSV (logique simplifiée)
    const headers = rawLines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    console.log(`📊 Données chargées: ${data.length} lignes`);
    
    // Créer et exécuter le processeur
    const processor = new EngStructureProcessor();
    
    console.log('\n⚙️ EXÉCUTION DU PROCESSEUR:');
    console.log('============================');
    
    const results = await processor.process(data, path.join(__dirname, 'output', 'eng_part_structure.csv'));
    
    console.log('\n📋 RÉSULTATS:');
    console.log('=============');
    console.log(`✅ Traitement terminé`);
    console.log(`📄 Fichier généré: output/eng_part_structure.csv`);
    
    // Analyser le fichier généré
    const outputPath = path.join(__dirname, 'output', 'eng_part_structure.csv');
    if (fs.existsSync(outputPath)) {
      const outputContent = fs.readFileSync(outputPath, 'utf8');
      const outputLines = outputContent.split('\n').filter(line => line.trim());
      console.log(`📊 Lignes dans le fichier de sortie: ${outputLines.length - 1} (sans header)`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('📍 Stack:', error.stack);
  }
}

// Lancer le test
testEngStructureProcessor();