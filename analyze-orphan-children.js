/**
 * ANALYSE DES "PIÈCES ENFANTS ORPHELINES"
 * 
 * Ce script analyse les 2044 pièces enfants qui n'ont pas de référence parent
 * pour comprendre si c'est normal ou problématique.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE DES PIÈCES ENFANTS ORPHELINES');
console.log('==========================================');

// Lire le fichier ENG_PART_STRUCTURE généré
const engStructurePath = path.join(__dirname, 'output', '02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv');

if (!fs.existsSync(engStructurePath)) {
  console.log('❌ Fichier eng_part_structure.csv non trouvé');
  console.log('   Lancez d\'abord le traitement complet pour générer ce fichier');
  process.exit(1);
}

const engStructureData = fs.readFileSync(engStructurePath, 'utf8');
const lines = engStructureData.split('\n').filter(line => line.trim());
const headers = lines[0].split(';').map(h => h.replace(/"/g, ''));

console.log(`📄 Fichier ENG_PART_STRUCTURE trouvé:`);
console.log(`   - ${lines.length - 1} lignes de données`);
console.log(`   - Colonnes: ${headers.join(', ')}`);

// Parser les données
const data = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.replace(/"/g, ''));
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
  data.push(row);
}

console.log(`\n📊 ANALYSE DES RELATIONS PARENT-ENFANT:`);
console.log('=====================================');

// Extraire tous les parents et enfants
const allParents = new Set();
const allChildren = new Set();

data.forEach(row => {
  const partNo = row['PART NO'];
  const subPartNo = row['SUB PART NO'];
  
  if (partNo && partNo.trim()) {
    allParents.add(partNo.trim());
  }
  
  if (subPartNo && subPartNo.trim()) {
    allChildren.add(subPartNo.trim());
  }
});

console.log(`   - Pièces uniques apparaissant comme PARENT: ${allParents.size}`);
console.log(`   - Pièces uniques apparaissant comme ENFANT: ${allChildren.size}`);

// Trouver les "vrais orphelins" - enfants qui ne sont jamais parents
const orphanChildren = Array.from(allChildren).filter(child => !allParents.has(child));

console.log(`   - Pièces orphelines (enfants sans jamais être parents): ${orphanChildren.length}`);

if (orphanChildren.length > 0) {
  console.log(`\n🔍 ÉCHANTILLON DES PIÈCES ORPHELINES (10 premières):`);
  console.log('=================================================');
  
  orphanChildren.slice(0, 10).forEach((orphan, index) => {
    // Trouver toutes les occurrences de cette pièce comme enfant
    const occurrences = data.filter(row => row['SUB PART NO'] === orphan);
    console.log(`${index + 1}. ${orphan}`);
    console.log(`   - Apparaît comme enfant dans ${occurrences.length} relations`);
    if (occurrences.length > 0) {
      const parents = [...new Set(occurrences.map(occ => occ['PART NO']).filter(p => p))];
      console.log(`   - Parents: ${parents.join(', ')}`);
    }
  });
}

// Analyser si ces orphelins sont des pièces "feuilles" (niveau le plus bas)
console.log(`\n🌿 ANALYSE DES PIÈCES FEUILLES:`);
console.log('=============================');

// Pour cela, on aurait besoin du fichier original pour voir les niveaux de structure
// Mais on peut déjà voir si c'est cohérent avec le concept de nomenclature

const parentsAndChildren = new Set([...allParents, ...allChildren]);
console.log(`   - Total de pièces uniques dans la structure: ${parentsAndChildren.size}`);
console.log(`   - Pièces qui sont à la fois parent ET enfant: ${Array.from(allParents).filter(p => allChildren.has(p)).length}`);
console.log(`   - Pièces qui sont SEULEMENT parents (racines): ${Array.from(allParents).filter(p => !allChildren.has(p)).length}`);
console.log(`   - Pièces qui sont SEULEMENT enfants (feuilles): ${orphanChildren.length}`);

console.log(`\n💡 INTERPRÉTATION:`);
console.log('=================');
console.log(`Les ${orphanChildren.length} "pièces orphelines" sont probablement:`);
console.log(`   1. Des pièces de niveau le plus bas (feuilles de l'arbre)`);
console.log(`   2. Des composants élémentaires qui ne contiennent pas d'autres pièces`);
console.log(`   3. Du point de vue métier: c'est NORMAL dans une nomenclature !`);

console.log(`\n✅ RECOMMANDATION:`);
console.log('==================');
console.log(`Il faut ajuster la validation pour ne PAS considérer cela comme un avertissement.`);
console.log(`Dans une nomenclature hiérarchique, il est normal d'avoir des pièces feuilles.`);

// Afficher quelques statistiques sur les QTY pour voir si c'est cohérent
console.log(`\n📈 STATISTIQUES QUANTITÉS:`);
console.log('=========================');
const quantities = data.map(row => parseFloat(row['QTY']) || 0).filter(q => q > 0);
const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
console.log(`   - Quantités moyennes: ${avgQty.toFixed(2)}`);
console.log(`   - Min: ${Math.min(...quantities)}, Max: ${Math.max(...quantities)}`);