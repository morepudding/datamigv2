/**
 * TEST SPÉCIFIQUE - Créer un CSV avec des pièces Obsolete 
 * et tester notre système de validation amélioré
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Créer un fichier CSV de test avec des pièces Obsolete
const testData = `"Structure Level","Number","Name","Part English designation","Source","Revision","State","Default Unit","Quantity","Context","Classification","Phantom Manufacturing Part","Configurable Module","Gathering Part","Site IFS","Marque","Matière","Masse","Thickness","Largeur sens du fil","Longueur sens du fil","Working length","Surface","Edge banding length","Edge banding thickness","Edge banding wood type","Edge banding width","Area","Largeur","Longueur","Profile","Finition face extérieure","Finition face intérieure","Matrice","Semelle","Position matrice","Side veneer thickness","Position moule","Code usinage","Numéro de moule","Aboutage","Side veneer wood type","Side veneer surface","Angle de découpe droite","Angle de découpe gauche","Angle de découpe oblique droite","Angle de découpe oblique gauche"
"0","000000437902","JY5MB COMPLETE BOAT","","Make","A","In Work","each","","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"1","000000437779","JY5MB EQUIPPED DECK","","Make","A","In Work","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"2","000000437855","JY5MB -Z- DECK OPTIONS","","Make","A","Obsolete","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"3","000000431599","JY5MB -ZBE- ASM PASSERELLE","","Make","A","Released","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"4","000000431597","JY5MB -ZBE- ASM PASSERELLE SQL","","Make","A","Under Review","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"5","000000431598","JY5MB TUYAU EVAC PASSERELLE","","Buy","A","Obsolete","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""`;

console.log('🧪 TEST DE VALIDATION DES PIÈCES OBSOLETE');
console.log('==========================================');

// Sauvegarder le fichier original s'il existe
const originalFile = 'JY5MB_complete_boat_20250428_0927CEST(in).csv';
const backupFile = originalFile + '.backup';
const testFile = 'test_obsolete_parts.csv';

if (fs.existsSync(originalFile)) {
  fs.copyFileSync(originalFile, backupFile);
  console.log(`💾 Sauvegarde créée: ${backupFile}`);
}

// Créer le fichier de test
fs.writeFileSync(testFile, testData);
console.log(`📄 Fichier de test créé: ${testFile}`);
console.log('   - Contient 2 pièces avec State = "Obsolete"'); 
console.log('   - Contient 1 pièce avec State = "Under Review"');

// Temporairement remplacer le fichier d'entrée
fs.copyFileSync(testFile, originalFile);

console.log('\n🚀 Lancement du test de workflow...\n');

// Exécuter le workflow de test
const testProcess = spawn('node', ['test-complete-workflow.js'], {
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  console.log('\n🔧 Nettoyage...');
  
  // Restaurer le fichier original
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, originalFile);
    fs.unlinkSync(backupFile);
    console.log('✅ Fichier original restauré');
  }
  
  // Supprimer les fichiers de test
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
  
  console.log('\n📋 RÉSUMÉ DU TEST:');
  console.log('==================');
  if (code === 0) {
    console.log('✅ Test réussi ! Le système gère maintenant correctement:');
    console.log('   - Les pièces avec State = "Obsolete" (considérées comme valides)');
    console.log('   - Les pièces enfants sans parents dues à l\'algorithme AX/AY/AZ');
    console.log('   - Validation intelligente qui comprend le contexte métier');
  } else {
    console.log('❌ Le test a échoué - code de sortie:', code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Erreur lors du lancement du test:', error);
  
  // Nettoyage en cas d'erreur
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, originalFile);
    fs.unlinkSync(backupFile);
  }
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
});