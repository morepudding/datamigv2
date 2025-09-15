/**
 * ANALYSE DÉTAILLÉE DES COLONNES MANQUANTES DANS LE FICHIER SOURCE
 * 
 * Vérifie si les 13 attributs manquants correspondent à des colonnes vides
 * ou s'il y a un problème de mapping.
 */

const fs = require('fs');

console.log('🔍 ANALYSE DÉTAILLÉE DU FICHIER SOURCE CSV');
console.log('===========================================');

// Lire le fichier CSV complet
const csvContent = fs.readFileSync('JY5MB_complete_boat_20250428_0927CEST(in).csv', 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log(`📄 Fichier: ${lines.length} lignes totales`);

// Parser le header
const headerLine = lines[0];
const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());

console.log(`📊 Headers: ${headers.length} colonnes détectées`);

// Mapping des attributs manquants avec les colonnes possibles du CSV
const missingAttributesMapping = {
  'RIGHT ANGLE': ['Angle de découpe droite'],
  'LEFT ANGLE': ['Angle de découpe gauche'], 
  'RIGHT OBLIQUE': ['Angle de découpe oblique droite'],
  'LEFT OBLIQUE': ['Angle de découpe oblique gauche'],
  'MATRL INT VN F': ['Finition face intérieure'],
  'MATRL OUT VN F': ['Finition face extérieure'],
  'OVERALL THICKN': ['Side veneer thickness'],
  'OVERALL WIDTH': ['Largeur', 'Width VNR SHEET'], // Possibles alternatives
  'PAINT AERA': ['Area'], // Si différent de VENEER AREA
  'MOLD NUMBER': ['Numéro de moule'],
  'SECTION': ['Semelle'],
  'MACHINING BOX': ['Code usinage'], // Peut-être une variante
  'WOOD GRAIN': ['Side veneer wood type', 'Edge banding wood type'] // Approximations
};

console.log('\n🔍 ANALYSE DES COLONNES MANQUANTES:');
console.log('===================================');

const analysisResults = {};

Object.entries(missingAttributesMapping).forEach(([ifsAttribute, possibleColumns]) => {
  console.log(`\n📋 ${ifsAttribute}:`);
  console.log(`   Colonnes possibles: ${possibleColumns.join(', ')}`);
  
  let foundColumn = null;
  let columnIndex = -1;
  
  // Chercher la colonne correspondante
  for (const possibleCol of possibleColumns) {
    const index = headers.indexOf(possibleCol);
    if (index >= 0) {
      foundColumn = possibleCol;
      columnIndex = index;
      break;
    }
  }
  
  if (foundColumn) {
    console.log(`   ✅ Colonne trouvée: "${foundColumn}" (index ${columnIndex})`);
    
    // Analyser les données dans cette colonne
    const nonEmptyValues = [];
    const emptyCount = 0;
    let totalValues = 0;
    
    // Analyser un échantillon de lignes (200 premières pour performance)
    const sampleSize = Math.min(200, lines.length - 1);
    
    for (let i = 1; i <= sampleSize; i++) {
      if (i < lines.length) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        totalValues++;
        
        if (columnIndex < values.length) {
          const value = values[columnIndex];
          if (value && value !== '' && value !== '0' && value !== 'NULL') {
            nonEmptyValues.push(value);
          }
        }
      }
    }
    
    const uniqueValues = [...new Set(nonEmptyValues)];
    
    console.log(`   📊 Échantillon analysé: ${totalValues} lignes`);
    console.log(`   📈 Valeurs non-vides: ${nonEmptyValues.length}`);
    console.log(`   🔢 Valeurs uniques: ${uniqueValues.length}`);
    
    if (uniqueValues.length > 0) {
      console.log(`   💡 Échantillon de valeurs:`);
      uniqueValues.slice(0, 10).forEach(val => {
        const count = nonEmptyValues.filter(v => v === val).length;
        console.log(`      "${val}" (${count} fois)`);
      });
      
      analysisResults[ifsAttribute] = {
        found: true,
        column: foundColumn,
        hasData: true,
        sampleValues: uniqueValues.slice(0, 5),
        nonEmptyCount: nonEmptyValues.length
      };
    } else {
      console.log(`   ❌ Colonne trouvée mais VIDE`);
      analysisResults[ifsAttribute] = {
        found: true,
        column: foundColumn,
        hasData: false,
        nonEmptyCount: 0
      };
    }
  } else {
    console.log(`   ❌ Aucune colonne correspondante trouvée`);
    console.log(`   🔍 Colonnes disponibles contenant ces mots:`);
    
    // Recherche approximative
    possibleColumns.forEach(searchTerm => {
      const matches = headers.filter(h => 
        h.toLowerCase().includes(searchTerm.toLowerCase()) ||
        searchTerm.toLowerCase().includes(h.toLowerCase())
      );
      if (matches.length > 0) {
        console.log(`      "${searchTerm}" → ${matches.join(', ')}`);
      }
    });
    
    analysisResults[ifsAttribute] = {
      found: false,
      hasData: false
    };
  }
});

console.log('\n📊 RÉSUMÉ DE L\'ANALYSE:');
console.log('========================');

const foundWithData = Object.entries(analysisResults).filter(([,r]) => r.found && r.hasData);
const foundEmpty = Object.entries(analysisResults).filter(([,r]) => r.found && !r.hasData);
const notFound = Object.entries(analysisResults).filter(([,r]) => !r.found);

console.log(`✅ Colonnes trouvées avec des données: ${foundWithData.length}`);
foundWithData.forEach(([attr, result]) => {
  console.log(`   ${attr}: "${result.column}" (${result.nonEmptyCount} valeurs)`);
});

console.log(`\n📊 Colonnes trouvées mais vides: ${foundEmpty.length}`);
foundEmpty.forEach(([attr, result]) => {
  console.log(`   ${attr}: "${result.column}" (vide)`);
});

console.log(`\n❌ Colonnes non trouvées: ${notFound.length}`);
notFound.forEach(([attr]) => {
  console.log(`   ${attr}: mapping à corriger`);
});

console.log(`\n💡 RECOMMANDATIONS:`);
console.log('==================');
if (foundWithData.length > 0) {
  console.log(`✅ ${foundWithData.length} attributs peuvent être ajoutés en corrigeant le mapping`);
}
if (foundEmpty.length > 0) {
  console.log(`📊 ${foundEmpty.length} attributs ont des colonnes vides (normal selon votre modèle PLM)`);
}
if (notFound.length > 0) {
  console.log(`🔧 ${notFound.length} attributs nécessitent une analyse plus poussée du mapping`);
}