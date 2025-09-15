/**
 * ANALYSE DES ATTRIBUTS TECHNIQUES MANQUANTS
 * 
 * Compare les colonnes du fichier CSV d'entrée avec le mapping d'attributs
 * pour identifier pourquoi certains attributs ne sont pas générés.
 */

const fs = require('fs');

console.log('🔍 ANALYSE DES ATTRIBUTS TECHNIQUES MANQUANTS');
console.log('==============================================');

// Lire le header du fichier CSV
const csvContent = fs.readFileSync('JY5MB_complete_boat_20250428_0927CEST(in).csv', 'utf8');
const firstLine = csvContent.split('\n')[0];

// Parser les colonnes (enlever les guillemets)
const columns = firstLine.split(',').map(col => col.replace(/^"|"$/g, '').trim());

console.log(`📄 Fichier CSV d'entrée: ${columns.length} colonnes détectées`);

// Mapping d'attributs défini dans le processeur
const attributeMapping = {
  'Marque': 'BRAND',
  'Matière': 'MATERIAL', 
  'Masse': 'WEIGHT',
  'Thickness': 'PANEL THICKNESS',
  'Largeur sens du fil': 'GRAIN DIR WIDTH',
  'Longueur sens du fil': 'GRAIN DIR LGTH',
  'Working length': 'OVERALL LENGTH',
  'Surface': 'SURFACE',
  'Edge banding length': 'EDGE LENGTH',
  'Edge banding thickness': 'EDGE THICKN',
  'Edge banding wood type': 'EDGE MATERIAL',
  'Edge banding width': 'EDGE WIDTH',
  'Largeur': 'WIDTH VNR SHEET',
  'Longueur': 'LNGH VENEER SHT',
  'Profile': 'PROFILE CODE',
  // Attributs manquants selon le mapping actuel
  'Machining Code': 'MACHINING CODE',
  'Right Angle': 'RIGHT ANGLE',
  'Left Angle': 'LEFT ANGLE',
  'Right Oblique': 'RIGHT OBLIQUE',
  'Left Oblique': 'LEFT OBLIQUE',
  'Matrl Int Vn F': 'MATRL INT VN F',
  'Matrl Out Vn F': 'MATRL OUT VN F',
  'Veneer Area': 'VENEER AREA',
  'Overall Thickn': 'OVERALL THICKN',
  'Overall Width': 'OVERALL WIDTH',
  'Paint Aera': 'PAINT AERA',
  'Veneer Material': 'VENEER MATERIAL',
  'Mold Plate': 'MOLD PLATE',
  'Mold Position': 'MOLD POSITION',
  'Mold Number': 'MOLD NUMBER',
  'Finger Joint': 'FINGER JOINT',
  'Section': 'SECTION',
  'Machining Box': 'MACHINING BOX',
  'Wood Grain': 'WOOD GRAIN'
};

console.log('\n🔗 CORRESPONDANCES ATTRIBUTS:');
console.log('=============================');

const foundColumns = [];
const missingColumns = [];

Object.keys(attributeMapping).forEach(plmAttribute => {
  const ifsAttribute = attributeMapping[plmAttribute];
  const found = columns.includes(plmAttribute);
  
  if (found) {
    foundColumns.push({ plm: plmAttribute, ifs: ifsAttribute });
    console.log(`✅ ${plmAttribute} → ${ifsAttribute}`);
  } else {
    missingColumns.push({ plm: plmAttribute, ifs: ifsAttribute });
    console.log(`❌ ${plmAttribute} → ${ifsAttribute} (COLONNE MANQUANTE)`);
  }
});

console.log('\n📊 RÉSUMÉ:');
console.log('==========');
console.log(`✅ Attributs trouvés: ${foundColumns.length}`);
console.log(`❌ Attributs manquants: ${missingColumns.length}`);

if (missingColumns.length > 0) {
  console.log('\n🔍 RECHERCHE DE CORRESPONDANCES POSSIBLES:');
  console.log('==========================================');
  
  missingColumns.forEach(missing => {
    console.log(`\n🔎 Recherche pour "${missing.plm}" → ${missing.ifs}:`);
    
    // Chercher des colonnes similaires
    const similarColumns = columns.filter(col => 
      col.toLowerCase().includes(missing.plm.toLowerCase().split(' ')[0]) ||
      missing.plm.toLowerCase().includes(col.toLowerCase().split(' ')[0]) ||
      // Recherches spécifiques
      (missing.plm === 'Machining Code' && col.toLowerCase().includes('usinage')) ||
      (missing.plm === 'Right Angle' && col.toLowerCase().includes('droite')) ||
      (missing.plm === 'Left Angle' && col.toLowerCase().includes('gauche')) ||
      (missing.plm === 'Right Oblique' && col.toLowerCase().includes('oblique') && col.toLowerCase().includes('droite')) ||
      (missing.plm === 'Left Oblique' && col.toLowerCase().includes('oblique') && col.toLowerCase().includes('gauche')) ||
      (missing.plm === 'Veneer Area' && col.toLowerCase().includes('area')) ||
      (missing.plm === 'Veneer Material' && col.toLowerCase().includes('veneer')) ||
      (missing.plm === 'Mold Plate' && col.toLowerCase().includes('matrice')) ||
      (missing.plm === 'Mold Position' && col.toLowerCase().includes('position')) ||
      (missing.plm === 'Mold Number' && col.toLowerCase().includes('moule')) ||
      (missing.plm === 'Finger Joint' && col.toLowerCase().includes('aboutage'))
    );
    
    if (similarColumns.length > 0) {
      console.log(`   💡 Correspondances possibles: ${similarColumns.join(', ')}`);
    } else {
      console.log(`   ❓ Aucune correspondance trouvée`);
    }
  });
}

console.log('\n📋 COLONNES DISPONIBLES DANS LE CSV:');
console.log('====================================');
columns.forEach((col, index) => {
  console.log(`${index + 1}. "${col}"`);
});