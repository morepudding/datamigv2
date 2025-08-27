import { describe, test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('Data Validation Tests - Simple', () => {
  
  test('should validate test file format', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    
    expect(fs.existsSync(testFilePath)).toBe(true);
    
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    expect(lines.length).toBeGreaterThan(100); // Au moins 100 lignes
    
    console.log(`📊 Fichier de test analysé:`);
    console.log(`   📄 Lignes totales: ${lines.length}`);
    console.log(`   📋 Première ligne (header): ${lines[0].substring(0, 100)}...`);
    
    // Vérifier que le header contient les colonnes clés
    const header = lines[0];
    expect(header).toContain('Number');
    expect(header).toContain('Source');
    expect(header).toContain('Classification');
    expect(header).toContain('State');
  });

  test('should detect data patterns', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Compter les patterns courants
    let buySourceCount = 0;
    let makeSourceCount = 0;
    let an99Classifications = 0;
    
    lines.slice(1, 100).forEach(line => { // Premier 100 lignes
      if (line.includes('"Buy"')) buySourceCount++;
      if (line.includes('"Make"')) makeSourceCount++;
      if (line.includes('AN99')) an99Classifications++;
    });
    
    console.log(`🔍 Patterns détectés (premiers 100 lignes):`);
    console.log(`   🛍️  Source "Buy": ${buySourceCount}`);
    console.log(`   🔧 Source "Make": ${makeSourceCount}`);
    console.log(`   📋 Classifications AN99: ${an99Classifications}`);
    
    expect(buySourceCount + makeSourceCount).toBeGreaterThan(0);
  });

  test('should verify file accessibility', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    
    // Vérifier les permissions de lecture
    expect(() => {
      fs.accessSync(testFilePath, fs.constants.R_OK);
    }).not.toThrow();
    
    // Vérifier la taille du fichier
    const stats = fs.statSync(testFilePath);
    expect(stats.size).toBeGreaterThan(1000); // Au moins 1KB
    
    console.log(`✅ Fichier accessible:`);
    console.log(`   📊 Taille: ${Math.round(stats.size / 1024)}KB`);
    console.log(`   📅 Modifié: ${stats.mtime.toLocaleDateString('fr-FR')}`);
  });

  test('should parse sample data manually', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Prendre une ligne d'exemple et essayer de la parser basiquement
    if (lines.length > 1) {
      const sampleLine = lines[1];
      console.log(`🔍 Ligne d'exemple: ${sampleLine.substring(0, 200)}...`);
      
      // Compter les virgules (approximation du nombre de colonnes)
      const commaCount = (sampleLine.match(/,/g) || []).length;
      console.log(`   📊 Nombre approximatif de colonnes: ${commaCount + 1}`);
      
      expect(commaCount).toBeGreaterThan(10); // Au moins 10 colonnes
    }
  });

  test('should validate expected data volume', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Vérifications de volume
    expect(lines.length).toBeGreaterThan(1000); // Au moins 1000 lignes
    expect(lines.length).toBeLessThan(20000);   // Moins de 20000 lignes
    
    console.log(`📈 Volume de données validé:`);
    console.log(`   📊 Lignes: ${lines.length} (dans la plage attendue)`);
    console.log(`   💾 Taille approximative par ligne: ${Math.round(content.length / lines.length)} caractères`);
  });
});
