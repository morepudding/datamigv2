// Script de test pour debugger le parsing CSV
const fs = require('fs');
const path = require('path');

// Lire les premières lignes du CSV
const csvPath = path.join(__dirname, 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').slice(0, 3); // Première ligne + 2 lignes de données

console.log('🔍 ANALYSE DU CSV:');
console.log('==================');

lines.forEach((line, index) => {
  console.log(`\n📝 Ligne ${index + 1}:`);
  console.log(`Raw: ${line.substring(0, 100)}...`);
  
  // Test des différents patterns de split
  console.log('\n🧪 Tests de split:');
  
  const patterns = [
    { name: '","', pattern: '","' },
    { name: ',"', pattern: ',"' },
    { name: ',""', pattern: ',""' },
    { name: ',', pattern: ',' }
  ];
  
  patterns.forEach(({ name, pattern }) => {
    if (line.includes(pattern)) {
      const parts = line.split(pattern);
      console.log(`  ✅ ${name}: ${parts.length} parties`);
      console.log(`     Premiers: ${parts.slice(0, 3).map(p => `"${p}"`).join(', ')}`);
    } else {
      console.log(`  ❌ ${name}: pattern non trouvé`);
    }
  });
});

// Test du nettoyage
console.log('\n🧹 TEST NETTOYAGE:');
console.log('==================');

const testHeaders = [
  'Structure Level',
  '"Number"',
  '""Name""',
  'Context"',
  '"Source',
  '""Classification""'
];

testHeaders.forEach(header => {
  let cleaned = header.replace(/^"*|"*$/g, '');
  cleaned = cleaned.replace(/""/g, '"');
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith('"')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  
  console.log(`"${header}" -> "${cleaned}"`);
});

// Simulation de la logique réelle
console.log('\n🎯 SIMULATION PARSER:');
console.log('=====================');

const firstLine = lines[0];
console.log(`\n📋 Header brut: ${firstLine.substring(0, 200)}...`);

let parts = [];
let method = 'unknown';

if (firstLine.includes(',"')) {
  parts = firstLine.split(',"');
  method = ',"';
} else if (firstLine.includes('","')) {
  parts = firstLine.split('","');
  method = '","';
} else if (firstLine.includes(',""')) {
  parts = firstLine.split(',""');
  method = ',""';
} else {
  parts = firstLine.split(',');
  method = ',';
}

console.log(`🔧 Méthode utilisée: ${method}`);
console.log(`📊 Parties détectées: ${parts.length}`);

const cleanedHeaders = parts.map(part => {
  let cleaned = part.replace(/^"*|"*$/g, '');
  cleaned = cleaned.replace(/""/g, '"');
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith('"')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned;
});

console.log('\n🏷️ Headers nettoyés:');
cleanedHeaders.slice(0, 10).forEach((header, index) => {
  console.log(`  ${index + 1}: "${header}"`);
});

const numberHeader = cleanedHeaders.find(h => h === 'Number');
const nameHeader = cleanedHeaders.find(h => h === 'Name');
const contextHeader = cleanedHeaders.find(h => h === 'Context');

console.log('\n🔍 Headers critiques trouvés:');
console.log(`  Number: "${numberHeader || 'NOT FOUND'}"`);
console.log(`  Name: "${nameHeader || 'NOT FOUND'}"`);
console.log(`  Context: "${contextHeader || 'NOT FOUND'}"`);
