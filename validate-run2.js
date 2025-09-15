/**
 * SCRIPT DE VALIDATION AUTOMATIQUE RUN 2
 * 
 * Ce script surveille le dossier output et valide automatiquement
 * tous les critères de conformité RUN 2 dès que les fichiers sont générés.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'output');
const EXPECTED_FILES = [
  {
    name: '01_L_PARTS_MD_004_CNB_PR4LC_WOOD.csv',
    type: 'master_part',
    minLines: 2000,
    checks: ['CLASSIFICATION', 'FALSE']
  },
  {
    name: '02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv', 
    type: 'eng_structure',
    minLines: 3500,
    maxLines: 4000,
    checks: ['PART_REV_EMPTY', 'SUB_PART_REV_EMPTY']
  },
  {
    name: '03_L_TECHNICAL_CLASS_VALUES_PR4LC_WOOD.csv',
    type: 'technical_specs', 
    minLines: 15000,
    checks: ['MACHINING CODE', 'VENEER AREA', 'WEIGHT', 'SURFACE', 'MATERIAL', 'GENERIC CODE']
  },
  {
    name: '04_L_INVENTORY_PART_PR4LC_WOOD.csv',
    type: 'inventory_part',
    minLines: 100,
    checks: ['TYPE_CODE_DB_1']
  },
  {
    name: 'master_part_all.csv',
    type: 'master_part_all',
    minLines: 2000,
    internal: true
  }
];

// Fonctions utilitaires
function countLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').filter(line => line.trim()).length - 1; // -1 pour header
}

function checkFileContent(filePath, checks) {
  if (!fs.existsSync(filePath)) return { valid: false, errors: ['File not found'] };
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const errors = [];
  const results = {};
  
  if (lines.length < 2) {
    errors.push('File has no data lines');
    return { valid: false, errors, results };
  }
  
  const headers = lines[0].split(';');
  const firstDataLine = lines[1].split(';');
  
  checks.forEach(check => {
    switch(check) {
      case 'CLASSIFICATION':
        const classificationIndex = headers.findIndex(h => h.includes('ASSORTMENT_ID')); 
        if (classificationIndex >= 0) {
          const value = firstDataLine[classificationIndex]?.replace(/"/g, '').trim();
          results.CLASSIFICATION = value === 'CLASSIFICATION';
          if (!results.CLASSIFICATION) {
            errors.push(`ASSORTMENT_ID should be "CLASSIFICATION", got "${value}"`);
          }
        }
        break;
        
      case 'FALSE':
        const falseIndex = headers.findIndex(h => h.includes('ALLOW_AS_NOT_CONSUMED'));
        if (falseIndex >= 0) {
          const value = firstDataLine[falseIndex]?.replace(/"/g, '').trim();
          results.FALSE = value === 'FALSE';
          if (!results.FALSE) {
            errors.push(`ALLOW_AS_NOT_CONSUMED should be "FALSE", got "${value}"`);
          }
        }
        break;
        
      case 'TYPE_CODE_DB_1':
        const typeCodeIndex = headers.findIndex(h => h.includes('TYPE_CODE_DB'));
        if (typeCodeIndex >= 0) {
          const value = firstDataLine[typeCodeIndex]?.replace(/"/g, '').trim();
          results.TYPE_CODE_DB_1 = value === '1';
          if (!results.TYPE_CODE_DB_1) {
            errors.push(`TYPE_CODE_DB should be "1", got "${value}"`);
          }
        }
        break;
        
      case 'PART_REV_EMPTY':
        const partRevIndex = headers.findIndex(h => h.includes('PART_REV'));
        if (partRevIndex >= 0) {
          const value = firstDataLine[partRevIndex]?.replace(/"/g, '').trim() || '';
          results.PART_REV_EMPTY = value === '';
          if (!results.PART_REV_EMPTY) {
            errors.push(`PART_REV should be empty, got "${value}"`);
          }
        }
        break;
        
      case 'SUB_PART_REV_EMPTY':
        const subPartRevIndex = headers.findIndex(h => h.includes('SUB_PART_REV'));
        if (subPartRevIndex >= 0) {
          const value = firstDataLine[subPartRevIndex]?.replace(/"/g, '').trim() || '';
          results.SUB_PART_REV_EMPTY = value === '';
          if (!results.SUB_PART_REV_EMPTY) {
            errors.push(`SUB_PART_REV should be empty, got "${value}"`);
          }
        }
        break;
        
      default:
        // Pour les attributs techniques, vérifier leur présence
        if (content.includes(check)) {
          results[check] = true;
        } else {
          results[check] = false;
          errors.push(`Technical attribute "${check}" not found`);
        }
    }
  });
  
  return { valid: errors.length === 0, errors, results };
}

function validateFiles() {
  console.log('\n🔍 VALIDATION DES FICHIERS DE CONFORMITÉ RUN 2');
  console.log('='.repeat(60));
  console.log(`📁 Dossier: ${OUTPUT_DIR}`);
  console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
  console.log('');
  
  let totalFiles = 0;
  let validFiles = 0;
  let totalErrors = 0;
  const results = {};
  
  EXPECTED_FILES.forEach(fileConfig => {
    const filePath = path.join(OUTPUT_DIR, fileConfig.name);
    const exists = fs.existsSync(filePath);
    
    console.log(`📄 ${fileConfig.name}`);
    console.log(`   Type: ${fileConfig.type}${fileConfig.internal ? ' (interne)' : ''}`);
    
    if (!exists) {
      console.log(`   ❌ Fichier manquant`);
      results[fileConfig.type] = { valid: false, errors: ['File missing'] };
      totalFiles++;
      return;
    }
    
    const lineCount = countLines(filePath);
    console.log(`   📊 Lignes: ${lineCount}`);
    
    // Vérification du nombre de lignes
    let lineCheckPassed = true;
    if (fileConfig.minLines && lineCount < fileConfig.minLines) {
      console.log(`   ❌ Trop peu de lignes: ${lineCount} < ${fileConfig.minLines}`);
      lineCheckPassed = false;
    }
    if (fileConfig.maxLines && lineCount > fileConfig.maxLines) {
      console.log(`   ❌ Trop de lignes: ${lineCount} > ${fileConfig.maxLines}`);
      lineCheckPassed = false;
    }
    if (lineCheckPassed && fileConfig.minLines) {
      console.log(`   ✅ Nombre de lignes OK: ${lineCount} >= ${fileConfig.minLines}`);
    }
    
    // Vérification du contenu
    let contentCheckPassed = true;
    if (fileConfig.checks) {
      const contentCheck = checkFileContent(filePath, fileConfig.checks);
      console.log(`   🔍 Vérifications du contenu:`);
      
      Object.entries(contentCheck.results).forEach(([check, passed]) => {
        console.log(`      ${passed ? '✅' : '❌'} ${check}`);
      });
      
      if (contentCheck.errors.length > 0) {
        console.log(`   ❌ Erreurs de contenu:`);
        contentCheck.errors.forEach(error => {
          console.log(`      • ${error}`);
        });
        contentCheckPassed = false;
        totalErrors += contentCheck.errors.length;
      }
    }
    
    const fileValid = lineCheckPassed && contentCheckPassed;
    if (fileValid) {
      console.log(`   ✅ Fichier valide`);
      validFiles++;
    } else {
      console.log(`   ❌ Fichier invalide`);
    }
    
    results[fileConfig.type] = {
      valid: fileValid,
      lineCount,
      exists: true
    };
    
    totalFiles++;
    console.log('');
  });
  
  // Résumé final
  console.log('🎯 RÉSUMÉ DE VALIDATION:');
  console.log(`   📊 Fichiers validés: ${validFiles}/${totalFiles}`);
  console.log(`   ❌ Erreurs totales: ${totalErrors}`);
  
  if (validFiles === totalFiles && totalErrors === 0) {
    console.log('\n🎉 ✅ TOUS LES CRITÈRES DE CONFORMITÉ RUN 2 SONT RESPECTÉS !');
    console.log('🚀 Le système génère des fichiers parfaitement conformes au RUN 2.');
  } else {
    console.log('\n⚠️ Certains critères ne sont pas respectés. Vérifiez les erreurs ci-dessus.');
  }
  
  return {
    totalFiles,
    validFiles, 
    totalErrors,
    allValid: validFiles === totalFiles && totalErrors === 0,
    results
  };
}

// Surveillance du dossier
function watchOutputFolder() {
  console.log('👀 Surveillance du dossier output en cours...');
  console.log('📍 Déposez le fichier JY5MB dans l\'interface web pour déclencher la validation.');
  
  let timeout;
  
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.watch(OUTPUT_DIR, (eventType, filename) => {
      if (filename && filename.endsWith('.csv')) {
        console.log(`📄 Fichier détecté: ${filename}`);
        
        // Debounce pour attendre que tous les fichiers soient créés
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          validateFiles();
        }, 2000); // Attendre 2 secondes après le dernier changement
      }
    });
  } else {
    console.log('📁 Création du dossier output...');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    setTimeout(watchOutputFolder, 1000);
  }
}

// Vérification immédiate si des fichiers existent déjà
if (fs.existsSync(OUTPUT_DIR)) {
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.csv'));
  if (files.length > 0) {
    console.log(`📄 ${files.length} fichier(s) CSV trouvé(s), validation immédiate...`);
    validateFiles();
  } else {
    watchOutputFolder();
  }
} else {
  watchOutputFolder();
}

// Export pour utilisation en module
module.exports = { validateFiles };