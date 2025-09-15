/**
 * TEST VIA API POUR VOIR LES AVERTISSEMENTS ENG_PART_STRUCTURE
 */

const fs = require('fs');
const path = require('path');

async function testViaAPI() {
  console.log('🌐 TEST VIA API POUR ENG_PART_STRUCTURE');
  console.log('========================================');

  try {
    // Lire le fichier CSV
    const csvFilePath = 'JY5MB_complete_boat_20250428_0927CEST(in).csv';
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    console.log(`📄 Fichier CSV lu: ${csvContent.length} caractères`);
    
    // Créer un FormData pour simuler l'upload
    const boundary = '----formdata-boundary';
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`
    ].join('\r\n');
    
    console.log('📡 Envoi de la requête à l\'API...');
    
    // Envoyer la requête
    const response = await fetch('http://localhost:3000/api/migration', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length.toString()
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('\n📊 RÉSULTAT DE L\'API:');
    console.log('======================');
    console.log(`✅ Succès: ${result.success}`);
    console.log(`📄 Code projet: ${result.projectCode}`);
    console.log(`📊 Lignes traitées: ${result.inputRows}`);
    console.log(`⚙️ Modules traités: ${result.totalModules}`);
    console.log(`❌ Erreurs: ${result.totalErrors}`);
    console.log(`⚠️ Avertissements: ${result.totalWarnings}`);
    
    if (result.moduleResults) {
      console.log('\n🔧 DÉTAILS PAR MODULE:');
      console.log('======================');
      
      result.moduleResults.forEach(module => {
        console.log(`\n📦 ${module.name}:`);
        console.log(`   ✅ Succès: ${module.success}`);
        console.log(`   📊 Lignes générées: ${module.outputRows}`);
        console.log(`   ❌ Erreurs: ${module.errors?.length || 0}`);
        console.log(`   ⚠️ Avertissements: ${module.warnings?.length || 0}`);
        
        if (module.warnings && module.warnings.length > 0) {
          console.log('   🔍 Détails des avertissements:');
          module.warnings.forEach((warning, index) => {
            console.log(`      ${index + 1}. ${warning.message || warning}`);
          });
        }
        
        if (module.errors && module.errors.length > 0) {
          console.log('   ❌ Détails des erreurs:');
          module.errors.forEach((error, index) => {
            console.log(`      ${index + 1}. ${error.message || error}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Assurez-vous que le serveur Next.js est en cours d\'exécution (npm run dev)');
    }
  }
}

// Lancer le test
testViaAPI();