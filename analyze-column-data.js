/**
 * ANALYSE DES DONNÉES DANS LES COLONNES IDENTIFIÉES
 * 
 * Vérifie le contenu réel des colonnes correspondant aux attributs manquants
 */

const fs = require('fs');

console.log('📊 ANALYSE DES DONNÉES DANS LES COLONNES IDENTIFIÉES');
console.log('======================================================');

// Lire le fichier et prendre un échantillon
const csvContent = fs.readFileSync('JY5MB_complete_boat_20250428_0927CEST(in).csv', 'utf8');
const lines = csvContent.split('\n').slice(0, 100); // Échantillon de 100 lignes

// Les colonnes identifiées avec leurs indices (basé sur l'output PowerShell)
const targetColumns = {
  '"Finition face extérieure"': 32,
  '"Finition face intérieure"': 33,
  '"Matrice"': 34,
  '"Semelle"': 35,
  '"Position matrice"': 36,
  '"Side veneer thickness"': 37,
  '"Position moule"': 38,
  '"Code usinage"': 39,
  '"Numéro de moule"': 40,
  '"Aboutage"': 41,
  '"Side veneer wood type"': 42,
  '"Side veneer surface"': 43,
  '"Angle de découpe droite"': 44,
  '"Angle de découpe gauche"': 45,
  '"Angle de découpe oblique droite"': 46,
  '"Area"': 28,
  '"Largeur"': 29
};

console.log('🔍 ANALYSE DES COLONNES CIBLES:');
console.log('===============================');

Object.entries(targetColumns).forEach(([columnName, index]) => {
  console.log(`\n📋 ${columnName} (index ${index}):`);
  
  const nonEmptyValues = [];
  let totalChecked = 0;
  
  // Analyser les lignes (ignorer le header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parser en tenant compte des guillemets
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        quoteCount++;
        if (quoteCount % 2 === 1) {
          inQuotes = true;
        } else {
          inQuotes = false;
        }
        // Ne pas inclure les guillemets dans la valeur
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    // Ajouter la dernière valeur
    values.push(currentValue.trim());
    
    totalChecked++;
    
    if (index < values.length) {
      const value = values[index];
      if (value && value !== '' && value !== '0' && value !== 'NULL') {
        nonEmptyValues.push(value);
      }
    }
  }
  
  const uniqueValues = [...new Set(nonEmptyValues)];
  
  console.log(`   📊 Lignes analysées: ${totalChecked}`);
  console.log(`   📈 Valeurs non-vides: ${nonEmptyValues.length}`);
  console.log(`   🔢 Valeurs uniques: ${uniqueValues.length}`);
  
  if (uniqueValues.length > 0) {
    console.log(`   💡 Exemples de valeurs:`);
    uniqueValues.slice(0, 5).forEach(val => {
      const count = nonEmptyValues.filter(v => v === val).length;
      console.log(`      "${val}" (${count} fois)`);
    });
  } else {
    console.log(`   ❌ Colonne vide dans l'échantillon`);
  }
});

console.log('\n📋 CORRESPONDANCES POUR LE MAPPING TECHNIQUE:');
console.log('==============================================');

const mappingCorrections = {
  '"Angle de découpe droite"': 'RIGHT ANGLE',
  '"Angle de découpe gauche"': 'LEFT ANGLE', 
  '"Angle de découpe oblique droite"': 'RIGHT OBLIQUE',
  '"Angle de découpe oblique gauche"': 'LEFT OBLIQUE',
  '"Finition face intérieure"': 'MATRL INT VN F',
  '"Finition face extérieure"': 'MATRL OUT VN F',
  '"Side veneer thickness"': 'OVERALL THICKN',
  '"Largeur"': 'OVERALL WIDTH',
  '"Area"': 'PAINT AERA',
  '"Numéro de moule"': 'MOLD NUMBER',
  '"Semelle"': 'SECTION',
  '"Code usinage"': 'MACHINING CODE', // Déjà fait mais pour info
  '"Side veneer wood type"': 'WOOD GRAIN'
};

Object.entries(mappingCorrections).forEach(([csvColumn, ifsAttribute]) => {
  console.log(`${csvColumn} → ${ifsAttribute}`);
});