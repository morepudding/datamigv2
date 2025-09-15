/**
 * TEST SPÉCIFIQUE POUR VÉRIFIER LA GESTION DES WARNINGS
 * 
 * Ce script crée un petit échantillon avec des cas problématiques
 * pour vérifier que nos corrections fonctionnent.
 */

const fs = require('fs');
const path = require('path');

// Créer un fichier CSV de test avec des pièces Obsolete
const testData = `"Structure Level","Number","Name","Part English designation","Source","Revision","State","Default Unit","Quantity","Context","Classification","Phantom Manufacturing Part","Configurable Module","Gathering Part","Site IFS","Marque","Matière","Masse","Thickness","Largeur sens du fil","Longueur sens du fil","Working length","Surface","Edge banding length","Edge banding thickness","Edge banding wood type","Edge banding width","Area","Largeur","Longueur","Profile","Finition face extérieure","Finition face intérieure","Matrice","Semelle","Position matrice","Side veneer thickness","Position moule","Code usinage","Numéro de moule","Aboutage","Side veneer wood type","Side veneer surface","Angle de découpe droite","Angle de découpe gauche","Angle de découpe oblique droite","Angle de découpe oblique gauche"
"0","000000437902","JY5MB COMPLETE BOAT","","Make","A","In Work","each","","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"1","000000437779","JY5MB EQUIPPED DECK","","Make","A","In Work","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"2","000000437855","JY5MB -Z- DECK OPTIONS","","Make","A","Obsolete","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"3","000000431599","JY5MB -ZBE- ASM PASSERELLE","","Make","A","Released","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"4","000000431597","JY5MB -ZBE- ASM PASSERELLE SQL","","Make","A","Under Review","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"4","000000431598","JY5MB TUYAU EVAC PASSERELLE","","Buy","A","Obsolete","each","1","JY5MB - JEANNEAU YACHT 55","CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00","No","No","No","","","","0 kg","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""`;

// Écrire le fichier de test
const testFilePath = path.join(__dirname, 'test-warnings.csv');
fs.writeFileSync(testFilePath, testData);

console.log('📄 Fichier de test créé avec des pièces Obsolete et Under Review');
console.log(`📍 Chemin: ${testFilePath}`);

// Maintenant, tester la validation sur ce fichier
const { validateInputData } = require('./dist/lib/utils/validation');

// Simuler la lecture du CSV (normalement fait par csv-parser)
const rows = [
  {
    "Structure Level": "0",
    "Number": "000000437902", 
    "Name": "JY5MB COMPLETE BOAT",
    "Source": "Make",
    "Revision": "A", 
    "State": "In Work",
    "Context": "JY5MB - JEANNEAU YACHT 55",
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  },
  {
    "Structure Level": "1",
    "Number": "000000437779",
    "Name": "JY5MB EQUIPPED DECK", 
    "Source": "Make",
    "Revision": "A",
    "State": "In Work", 
    "Context": "JY5MB - JEANNEAU YACHT 55",
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  },
  {
    "Structure Level": "2", 
    "Number": "000000437855",
    "Name": "JY5MB -Z- DECK OPTIONS",
    "Source": "Make",
    "Revision": "A",
    "State": "Obsolete",  // ← Pièce obsolète
    "Context": "JY5MB - JEANNEAU YACHT 55",
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  },
  {
    "Structure Level": "3",
    "Number": "000000431599", 
    "Name": "JY5MB -ZBE- ASM PASSERELLE",
    "Source": "Make",
    "Revision": "A",
    "State": "Released",
    "Context": "JY5MB - JEANNEAU YACHT 55", 
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  },
  {
    "Structure Level": "4",
    "Number": "000000431597",
    "Name": "JY5MB -ZBE- ASM PASSERELLE SQL",
    "Source": "Make", 
    "Revision": "A",
    "State": "Under Review",
    "Context": "JY5MB - JEANNEAU YACHT 55",
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  },
  {
    "Structure Level": "4",
    "Number": "000000431598",
    "Name": "JY5MB TUYAU EVAC PASSERELLE",
    "Source": "Buy",
    "Revision": "A", 
    "State": "Obsolete",  // ← Autre pièce obsolète
    "Context": "JY5MB - JEANNEAU YACHT 55",
    "Classification": "CLASSIFICATION/TO BE CLASSIFIED/TO BE CLASSIFIED 2 - AN99-01-00"
  }
];

console.log('\n🔍 TEST DE VALIDATION AVEC PIÈCES OBSOLETES:');
console.log('============================================');

const validationResult = validateInputData(rows);

console.log(`📊 Résultat de validation:`);
console.log(`   - Valide: ${validationResult.isValid}`);  
console.log(`   - Erreurs: ${validationResult.errors.length}`);
console.log(`   - Avertissements: ${validationResult.warnings.length}`);

if (validationResult.warnings.length > 0) {
  console.log('\n⚠️ Avertissements détectés:');
  validationResult.warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning.message} (ligne ${warning.rowIndex + 1})`);
  });
} else {
  console.log('\n✅ Aucun avertissement - Les pièces Obsolete sont maintenant acceptées !');
}

if (validationResult.errors.length > 0) {
  console.log('\n❌ Erreurs détectées:');
  validationResult.errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error.message}`);
  });
}

// Nettoyage
fs.unlinkSync(testFilePath);
console.log('\n🗑️ Fichier de test supprimé');

module.exports = { testWarningsValidation: true };