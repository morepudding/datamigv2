/**
 * VÉRIFICATION DES DONNÉES D'ANGLES DANS LE CSV SOURCE
 */

const fs = require('fs');

console.log('🔍 VÉRIFICATION DES COLONNES D\'ANGLES');
console.log('=====================================');

// Lire le CSV et analyser quelques lignes
const csvContent = fs.readFileSync('JY5MB_complete_boat_20250428_0927CEST(in).csv', 'utf8');
const lines = csvContent.split('\n').slice(0, 10); // Prendre les 10 premières lignes

// Parser le header
const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());

// Trouver les indices des colonnes d'angles
const angleColumns = {
  'Angle de découpe droite': headers.indexOf('Angle de découpe droite'),
  'Angle de découpe gauche': headers.indexOf('Angle de découpe gauche'), 
  'Angle de découpe oblique droite': headers.indexOf('Angle de découpe oblique droite'),
  'Angle de découpe oblique gauche': headers.indexOf('Angle de découpe oblique gauche')
};

console.log('📍 INDICES DES COLONNES D\'ANGLES:');
Object.entries(angleColumns).forEach(([name, index]) => {
  console.log(`   ${name}: index ${index}`);
});

console.log('\n📊 ÉCHANTILLON DE DONNÉES:');
console.log('==========================');

// Analyser quelques lignes de données
for (let i = 1; i < Math.min(lines.length, 6); i++) {
  const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
  console.log(`\nLigne ${i}:`);
  
  Object.entries(angleColumns).forEach(([name, index]) => {
    if (index >= 0 && index < values.length) {
      const value = values[index];
      console.log(`   ${name}: "${value}"`);
    }
  });
}