#!/usr/bin/env node

/**
 * Script principal pour lancer les tests du système de migration
 * Utilise le fichier JY5MB_complete_boat_20250428_0927CEST(in).csv comme données de test
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = process.cwd();
const TEST_FILE = path.join(PROJECT_ROOT, 'JY5MB_complete_boat_20250428_0927CEST(in).csv');

console.log('🧪 SYSTÈME DE TEST - MIGRATION PLM vers IFS');
console.log('='.repeat(60));
console.log(`📁 Projet: ${PROJECT_ROOT}`);
console.log(`📄 Fichier de test: ${path.basename(TEST_FILE)}`);

// Vérification des prérequis
if (!fs.existsSync(TEST_FILE)) {
  console.error(`❌ ERREUR: Fichier de test manquant: ${TEST_FILE}`);
  process.exit(1);
}

console.log(`✅ Fichier de test trouvé: ${fs.statSync(TEST_FILE).size} bytes`);

// Configuration des tests
const testConfigs = [
  {
    name: 'Tests Unitaires - Master Part',
    command: 'npx jest tests/processors/master-part.test.ts --verbose',
    timeout: 30000
  },
  {
    name: 'Tests Unitaires - Master Part All',
    command: 'npx jest tests/processors/master-part-all.test.ts --verbose',
    timeout: 30000
  },
  {
    name: 'Test d\'Intégration Complet',
    command: 'npx jest tests/integration/full-system.test.ts --verbose --detectOpenHandles',
    timeout: 120000
  },
  {
    name: 'Tous les Tests',
    command: 'npx jest --coverage --verbose',
    timeout: 180000
  }
];

async function runTest(config: typeof testConfigs[0]): Promise<{success: boolean, duration: number, output?: string}> {
  const startTime = Date.now();
  console.log(`\n🚀 Lancement: ${config.name}`);
  console.log(`📝 Commande: ${config.command}`);
  console.log('-'.repeat(40));

  try {
    const output = execSync(config.command, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      timeout: config.timeout,
      encoding: 'utf-8'
    });

    const duration = Date.now() - startTime;
    console.log(`✅ ${config.name} - SUCCÈS (${duration}ms)`);
    
    return { success: true, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${config.name} - ÉCHEC (${duration}ms)`);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    
    return { success: false, duration, output: error.message };
  }
}

async function main() {
  const results = [];
  const overallStart = Date.now();

  console.log('\n🎯 SÉLECTION DU TYPE DE TEST:');
  console.log('1. Tests unitaires seulement');
  console.log('2. Test d\'intégration complet');
  console.log('3. Tous les tests avec couverture');

  // Pour l'instant, lance tous les tests par défaut
  const selectedTests = testConfigs.slice(0, 3); // Exclut "Tous les Tests" pour éviter la duplication

  for (const config of selectedTests) {
    const result = await runTest(config);
    results.push({
      name: config.name,
      ...result
    });
  }

  const totalDuration = Date.now() - overallStart;
  const successCount = results.filter(r => r.success).length;

  // Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL DES TESTS');
  console.log('='.repeat(60));

  results.forEach(result => {
    const status = result.success ? '✅ SUCCÈS' : '❌ ÉCHEC';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
  });

  console.log('\n📈 RÉSUMÉ:');
  console.log(`⏱️  Durée totale: ${totalDuration}ms`);
  console.log(`🎯 Résultat: ${successCount}/${results.length} tests réussis`);

  if (successCount === results.length) {
    console.log('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!');
    console.log('\n📁 Résultats disponibles dans:');
    console.log(`   📄 Fichiers CSV: ${path.join(PROJECT_ROOT, 'output')}`);
    console.log(`   📊 Couverture: ${path.join(PROJECT_ROOT, 'coverage')}`);
  } else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔍 Vérifiez les logs ci-dessus pour plus de détails');
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Lancement du script
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
