const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Simulation des fonctions de validation et traitement
function simulateValidation(inputData) {
  console.log('🔍 VALIDATION DES DONNÉES:');
  console.log(`  📊 Lignes totales: ${inputData.length}`);
  
  if (inputData.length === 0) {
    return { isValid: false, errors: ['Aucune donnée trouvée'], warnings: [] };
  }
  
  const firstRow = inputData[0];
  const requiredColumns = ['Number', 'Name', 'Context'];
  const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));
  
  if (missingColumns.length > 0) {
    return { 
      isValid: false, 
      errors: [`Colonnes manquantes: ${missingColumns.join(', ')}`], 
      warnings: [] 
    };
  }
  
  console.log('  ✅ Validation réussie');
  return { isValid: true, errors: [], warnings: [] };
}

function simulateProcessing(inputData, moduleName) {
  console.log(`🔄 TRAITEMENT MODULE: ${moduleName}`);
  
  // Simulation du temps de traitement
  const startTime = Date.now();
  
  // Filtrer selon le module (simulation)
  let outputRows = 0;
  switch (moduleName) {
    case 'master-part':
      outputRows = inputData.filter(row => row.Number && row.Number.trim()).length;
      break;
    case 'technical-specs':
      outputRows = inputData.filter(row => row.Name && row.Name.trim()).length;
      break;
    default:
      outputRows = Math.floor(inputData.length * 0.8); // Simulation
  }
  
  const processingTime = Date.now() - startTime;
  
  console.log(`  ✅ ${outputRows} lignes générées en ${processingTime}ms`);
  
  return {
    success: true,
    module: moduleName,
    rowsInput: inputData.length,
    rowsOutput: outputRows,
    processingTime,
    errors: [],
    warnings: []
  };
}

async function testCompleteWorkflow() {
  console.log('🚀 TEST WORKFLOW COMPLET PLM VERS IFS');
  console.log('=====================================\n');
  
  const csvFilePath = path.join(__dirname, 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('❌ ERREUR: Fichier CSV introuvable:', csvFilePath);
    return;
  }
  
  console.log('📄 ÉTAPE 1: LECTURE DU FICHIER CSV');
  console.log('-----------------------------------');
  
  try {
    // Lecture du fichier CSV avec xlsx
    const workbook = xlsx.readFile(csvFilePath, { 
      type: 'file',
      raw: false,
      codepage: 65001 // UTF-8
    });
    
    const sheetName = workbook.SheetNames[0];
    let rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      raw: false,
      header: 1  // Utiliser les indices pour les headers complexes
    });
    
    console.log(`  📊 Données brutes lues: ${rawData.length} lignes`);
    
    // Post-traitement spécial pour les CSV avec guillemets doubles
    let inputData = [];
    
    if (rawData.length > 0) {
      console.log('  🔧 Post-traitement CSV avec guillemets doubles');
      
      // Première ligne = headers, les nettoyer
      const rawHeaders = rawData[0];
      const headers = [];
      
      // Parser la première ligne qui contient tous les headers concaténés
      if (rawHeaders.length === 1 && typeof rawHeaders[0] === 'string') {
        const fullHeader = rawHeaders[0];
        console.log(`  🔍 Header brut: ${fullHeader.substring(0, 100)}...`);
        
        // Pattern plus précis pour ce format spécial
        let parts = [];
        
        if (fullHeader.includes(',"')) {
          // Le bon pattern est ',"' (virgule + guillemet simple)
          parts = fullHeader.split(',"');
          console.log('  🎯 Utilisation du pattern \',"\'');
        } else if (fullHeader.includes('","')) {
          parts = fullHeader.split('","');
          console.log('  🎯 Utilisation du pattern \'","\'');
        } else if (fullHeader.includes(',""')) {
          parts = fullHeader.split(',""');
          console.log('  🎯 Utilisation du pattern \',""\'');
        } else {
          parts = fullHeader.split(',');
          console.log('  🎯 Utilisation du pattern \',\'');
        }
        
        // Nettoyer chaque partie plus agressivement
        headers.push(...parts.map(part => {
          let cleaned = part.replace(/^"*|"*$/g, '');
          cleaned = cleaned.replace(/""/g, '"');
          cleaned = cleaned.trim();
          if (cleaned.startsWith('"')) {
            cleaned = cleaned.substring(1);
          }
          if (cleaned.endsWith('"')) {
            cleaned = cleaned.substring(0, cleaned.length - 1);
          }
          return cleaned;
        }));
        
        console.log(`  🔧 ${parts.length} colonnes détectées`);
        console.log(`  🏷️ Headers principaux: ${headers.slice(0, 5).join(', ')}...`);
        console.log(`  🔍 Headers critiques trouvés:`);
        console.log(`     - Number: "${headers.find(h => h.includes('Number')) || 'NON TROUVÉ'}"`);
        console.log(`     - Name: "${headers.find(h => h.includes('Name')) || 'NON TROUVÉ'}"`);
        console.log(`     - Context: "${headers.find(h => h.includes('Context')) || 'NON TROUVÉ'}"`);
      }
      
      // Traiter les lignes de données
      const dataRows = [];
      for (let i = 1; i < Math.min(rawData.length, 101); i++) { // Test sur 100 lignes
        const rawRow = rawData[i];
        const rowData = {};
        
        if (rawRow.length === 1 && typeof rawRow[0] === 'string') {
          // Ligne concaténée, la séparer avec la même méthode que les headers
          const fullRow = rawRow[0];
          let values = [];
          
          if (fullRow.includes(',"')) {
            values = fullRow.split(',"');
          } else if (fullRow.includes('","')) {
            values = fullRow.split('","');
          } else if (fullRow.includes(',""')) {
            values = fullRow.split(',""');
          } else {
            values = fullRow.split(',');
          }
          
          // Nettoyer les valeurs plus agressivement
          values = values.map(val => {
            let cleaned = val.replace(/^"*|"*$/g, '');
            cleaned = cleaned.replace(/""/g, '"');
            cleaned = cleaned.trim();
            if (cleaned.startsWith('"')) {
              cleaned = cleaned.substring(1);
            }
            if (cleaned.endsWith('"')) {
              cleaned = cleaned.substring(0, cleaned.length - 1);
            }
            return cleaned;
          });
          
          // Mapper aux headers
          for (let j = 0; j < Math.min(headers.length, values.length); j++) {
            rowData[headers[j]] = values[j] || '';
          }
        }
        
        dataRows.push(rowData);
      }
      
      inputData = dataRows;
    }
    
    console.log(`  ✅ Données finales: ${inputData.length} lignes, ${Object.keys(inputData[0] || {}).length} colonnes\n`);
    
    // Afficher un échantillon des données
    if (inputData.length > 0) {
      console.log('📋 ÉCHANTILLON DES DONNÉES:');
      console.log('---------------------------');
      const sampleRow = inputData[0];
      Object.keys(sampleRow).slice(0, 8).forEach(key => {
        const value = sampleRow[key];
        console.log(`  ${key}: "${value.toString().substring(0, 30)}${value.toString().length > 30 ? '...' : ''}"`);
      });
      console.log('');
    }
    
    // Extraction du code projet
    let projectCode = 'XXXXX';
    if (inputData.length > 0 && inputData[0]['Context']) {
      const context = inputData[0]['Context'].toString().trim();
      if (context.length >= 5) {
        projectCode = context.substring(0, 5);
      }
    }
    console.log(`🏷️ Code projet détecté: ${projectCode}\n`);
    
    console.log('🔍 ÉTAPE 2: VALIDATION');
    console.log('----------------------');
    const validationResult = simulateValidation(inputData);
    
    if (!validationResult.isValid) {
      console.error('❌ VALIDATION ÉCHOUÉE:');
      validationResult.errors.forEach(error => console.error(`  - ${error}`));
      return;
    }
    
    console.log('');
    
    console.log('⚙️ ÉTAPE 3: TRAITEMENT DES MODULES');
    console.log('----------------------------------');
    
    const modules = [
      'master-part',
      'master-part-all', 
      'technical-specs',
      'eng-structure',
      'inventory-part',
      'inventory-plan'
    ];
    
    const results = [];
    for (const module of modules) {
      const result = simulateProcessing(inputData, module);
      results.push(result);
    }
    
    console.log('');
    
    console.log('📊 RÉSUMÉ FINAL:');
    console.log('----------------');
    console.log(`  📄 Fichier traité: ${path.basename(csvFilePath)}`);
    console.log(`  🏷️ Code projet: ${projectCode}`);
    console.log(`  📊 Lignes d'entrée: ${inputData.length}`);
    console.log(`  ⚙️ Modules traités: ${results.length}`);
    console.log(`  ✅ Modules réussis: ${results.filter(r => r.success).length}`);
    console.log(`  ❌ Modules échoués: ${results.filter(r => !r.success).length}`);
    console.log(`  📈 Total lignes générées: ${results.reduce((sum, r) => sum + r.rowsOutput, 0)}`);
    
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    console.log(`  ⚠️ Erreurs: ${totalErrors}, Avertissements: ${totalWarnings}`);
    
    console.log('');
    console.log('🎉 TEST WORKFLOW COMPLET RÉUSSI !');
    
  } catch (error) {
    console.error('💥 ERREUR DURANT LE TEST:', error.message);
    console.error(error.stack);
  }
}

// Lancer le test
testCompleteWorkflow();
