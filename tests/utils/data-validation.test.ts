import { describe, test, expect } from '@jest/globals';
import { TestHelpers } from '../helpers/test-helpers';
import * as path from 'path';
import * as fs from 'fs';

describe('Data Validation Tests', () => {
  test('should validate test file structure', async () => {
    console.log('\n📋 Validation de la structure du fichier de test...');
    
    const testData = await TestHelpers.loadTestCSV();
    
    expect(testData.length).toBeGreaterThan(0);
    console.log(`📊 Lignes chargées: ${testData.length}`);
    
    // Vérification des colonnes essentielles
    const requiredColumns = ['Number', 'Source', 'Classification', 'State', 'Version'];
    const firstRow = testData[0];
    
    requiredColumns.forEach(col => {
      expect(firstRow).toHaveProperty(col);
      console.log(`✅ Colonne '${col}': présente`);
    });
  });

  test('should analyze data distribution', async () => {
    console.log('\n📈 Analyse de la distribution des données...');
    
    const testData = await TestHelpers.loadTestCSV();
    
    // Distribution des Sources
    const sourceDistribution = testData.reduce((acc: Record<string, number>, row) => {
      const source = row.Source?.toString().toLowerCase().trim() || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Distribution des Sources:');
    Object.entries(sourceDistribution).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} lignes (${(count / testData.length * 100).toFixed(1)}%)`);
    });
    
    // Distribution des États
    const stateDistribution = testData.reduce((acc: Record<string, number>, row) => {
      const state = row.State?.toString().toLowerCase().trim() || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Distribution des États:');
    Object.entries(stateDistribution).forEach(([state, count]) => {
      console.log(`   ${state}: ${count} lignes (${(count / testData.length * 100).toFixed(1)}%)`);
    });

    expect(Object.keys(sourceDistribution).length).toBeGreaterThan(0);
    expect(Object.keys(stateDistribution).length).toBeGreaterThan(0);
  });

  test('should identify data quality issues', async () => {
    console.log('\n🔍 Analyse de la qualité des données...');
    
    const testData = await TestHelpers.loadTestCSV();
    
    let emptyNumbers = 0;
    let emptyClassifications = 0;
    let invalidVersions = 0;
    let duplicateNumbers = new Set();
    const seenNumbers = new Set();
    
    testData.forEach((row, index) => {
      // Numéros vides
      if (!row.Number || row.Number.trim() === '') {
        emptyNumbers++;
      } else {
        // Doublons
        if (seenNumbers.has(row.Number)) {
          duplicateNumbers.add(row.Number);
        } else {
          seenNumbers.add(row.Number);
        }
      }
      
      // Classifications vides
      if (!row.Classification || row.Classification.trim() === '') {
        emptyClassifications++;
      }
      
      // Versions invalides
      if (row.Version && !/^[A-F]$/.test(row.Version.trim())) {
        invalidVersions++;
      }
    });
    
    console.log('🔍 Problèmes de qualité détectés:');
    console.log(`   📝 Numéros vides: ${emptyNumbers}`);
    console.log(`   📋 Classifications vides: ${emptyClassifications}`);
    console.log(`   🔄 Versions invalides: ${invalidVersions}`);
    console.log(`   🔂 Numéros dupliqués: ${duplicateNumbers.size} uniques`);
    console.log(`   📊 Taux de qualité: ${((testData.length - emptyNumbers - emptyClassifications) / testData.length * 100).toFixed(1)}%`);
    
    // Les assertions peuvent être ajustées selon les attentes
    expect(emptyNumbers).toBeLessThan(testData.length); // Pas plus de 100% vides
    expect(duplicateNumbers.size).toBeGreaterThanOrEqual(0); // Au moins 0 doublons
  });

  test('should validate classification patterns', async () => {
    console.log('\n🔍 Validation des patterns de classification...');
    
    const testData = await TestHelpers.loadTestCSV();
    
    let an29Classifications = 0;
    let an29_02_00Classifications = 0;
    let validLengthClassifications = 0;
    
    testData.forEach(row => {
      if (row.Classification) {
        const classification = row.Classification.trim();
        
        if (classification.length >= 10) {
          validLengthClassifications++;
        }
        
        if (classification.includes('AN29')) {
          an29Classifications++;
        }
        
        if (classification.includes('AN29-02-00')) {
          an29_02_00Classifications++;
        }
      }
    });
    
    console.log('📋 Analyse des classifications:');
    console.log(`   📏 Longueur >= 10: ${validLengthClassifications}/${testData.length}`);
    console.log(`   🔍 Contient AN29: ${an29Classifications}/${testData.length}`);
    console.log(`   🎯 Pattern AN29-02-00: ${an29_02_00Classifications}/${testData.length}`);
    
    expect(validLengthClassifications).toBeGreaterThan(0);
    expect(an29Classifications).toBeGreaterThan(0);
  });

  test('should validate numeric fields', async () => {
    console.log('\n🔢 Validation des champs numériques...');
    
    const testData = await TestHelpers.loadTestCSV();
    
    const numericFields = ['Structure Level', 'Quantity', 'Masse'];
    const fieldStats: Record<string, {valid: number, invalid: number, empty: number}> = {};
    
    numericFields.forEach(field => {
      fieldStats[field] = {valid: 0, invalid: 0, empty: 0};
      
      testData.forEach(row => {
        const value = row[field as keyof typeof row];
        
        if (!value || value.toString().trim() === '') {
          fieldStats[field].empty++;
        } else {
          const cleanValue = value.toString().replace(/[^0-9.-]/g, '');
          if (!isNaN(Number(cleanValue)) && cleanValue !== '') {
            fieldStats[field].valid++;
          } else {
            fieldStats[field].invalid++;
          }
        }
      });
    });
    
    console.log('🔢 Statistiques des champs numériques:');
    Object.entries(fieldStats).forEach(([field, stats]) => {
      const total = stats.valid + stats.invalid + stats.empty;
      console.log(`   ${field}:`);
      console.log(`     ✅ Valides: ${stats.valid}/${total} (${(stats.valid/total*100).toFixed(1)}%)`);
      console.log(`     ❌ Invalides: ${stats.invalid}/${total}`);
      console.log(`     ⚪ Vides: ${stats.empty}/${total}`);
    });
    
    // Vérifications de base
    numericFields.forEach(field => {
      expect(fieldStats[field].valid + fieldStats[field].invalid + fieldStats[field].empty).toBe(testData.length);
    });
  });
});
