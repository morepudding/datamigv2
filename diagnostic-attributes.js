/**
 * RAPPORT DIAGNOSTIC COMPLET DES ATTRIBUTS TECHNIQUES
 * 
 * Compare les attributs demandés vs générés et analyse les causes
 */

const fs = require('fs');

console.log('📋 RAPPORT DIAGNOSTIC ATTRIBUTS TECHNIQUES');
console.log('===========================================');

// Lire le fichier généré actuel
const generatedContent = fs.readFileSync('output/03_L_TECHNICAL_CLASS_VALUES_PR4LC_WOOD.csv', 'utf8');
const generatedLines = generatedContent.split('\n').filter(line => line.trim());

// Parser les attributs générés
const generatedAttributes = new Set();
generatedLines.slice(1).forEach(line => {
  const [masterPart, attribut, valeur, type] = line.split(';');
  if (attribut) {
    generatedAttributes.add(attribut);
  }
});

console.log(`📊 ATTRIBUTS ACTUELLEMENT GÉNÉRÉS (${generatedAttributes.size}):`);
console.log('==================================================');
Array.from(generatedAttributes).sort().forEach(attr => {
  console.log(`✅ ${attr}`);
});

// Attributs demandés par l'utilisateur
const requestedAttributes = [
  'MACHINING CODE',
  'RIGHT ANGLE', 
  'LEFT ANGLE',
  'RIGHT OBLIQUE',
  'LEFT OBLIQUE',
  'MATRL INT VN F',
  'MATRL OUT VN F', 
  'VENEER AREA',
  'OVERALL THICKN',
  'OVERALL WIDTH',
  'PAINT AERA',
  'VENEER MATERIAL',
  'MOLD PLATE',
  'MOLD POSITION', 
  'MOLD NUMBER',
  'FINGER JOINT',
  'SECTION',
  'MACHINING BOX',
  'WOOD GRAIN'
];

console.log(`\n📋 ANALYSE DES ATTRIBUTS DEMANDÉS (${requestedAttributes.length}):`);
console.log('================================================');

const foundAttributes = [];
const missingAttributes = [];

requestedAttributes.forEach(attr => {
  if (generatedAttributes.has(attr)) {
    foundAttributes.push(attr);
    console.log(`✅ ${attr} - PRÉSENT`);
  } else {
    missingAttributes.push(attr);
    console.log(`❌ ${attr} - MANQUANT`);
  }
});

console.log(`\n📊 RÉSUMÉ:`);
console.log('=========');
console.log(`✅ Attributs trouvés: ${foundAttributes.length}/${requestedAttributes.length}`);
console.log(`❌ Attributs manquants: ${missingAttributes.length}/${requestedAttributes.length}`);

if (foundAttributes.length > 0) {
  console.log(`\n🎉 ATTRIBUTS MAINTENANT DISPONIBLES:`);
  console.log('===================================');
  foundAttributes.forEach(attr => console.log(`   ✅ ${attr}`));
}

if (missingAttributes.length > 0) {
  console.log(`\n⚠️ ATTRIBUTS ENCORE MANQUANTS:`);
  console.log('==============================');
  missingAttributes.forEach(attr => console.log(`   ❌ ${attr}`));
  
  console.log(`\n💡 CAUSES POSSIBLES:`);
  console.log('==================');
  console.log('1. 📝 Nom de colonne CSV incorrect dans le mapping');
  console.log('2. 📊 Colonnes vides dans le fichier source'); 
  console.log('3. 🔧 Filtrage qui exclut ces données');
  console.log('4. 🏷️ Nom d\'attribut IFS incorrect');
}

// Compter les lignes par type d'attribut pour les attributs présents
console.log(`\n📈 STATISTIQUES DES ATTRIBUTS GÉNÉRÉS:`);
console.log('=====================================');

const attributeStats = {};
generatedLines.slice(1).forEach(line => {
  const [masterPart, attribut, valeur, type] = line.split(';');
  if (attribut) {
    if (!attributeStats[attribut]) {
      attributeStats[attribut] = { count: 0, type: type };
    }
    attributeStats[attribut].count++;
  }
});

Object.entries(attributeStats)
  .sort(([,a], [,b]) => b.count - a.count)
  .forEach(([attr, stats]) => {
    console.log(`   ${attr}: ${stats.count} lignes (type ${stats.type})`);
  });