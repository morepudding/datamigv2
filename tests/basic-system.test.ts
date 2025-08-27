import { describe, test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('Basic System Tests', () => {
  
  test('should have test file available', () => {
    const testFilePath = path.join(process.cwd(), 'JY5MB_complete_boat_20250428_0927CEST(in).csv');
    expect(fs.existsSync(testFilePath)).toBe(true);
    
    const stats = fs.statSync(testFilePath);
    expect(stats.size).toBeGreaterThan(0);
    
    console.log(`✅ Fichier de test trouvé: ${path.basename(testFilePath)}`);
    console.log(`   📊 Taille: ${Math.round(stats.size / 1024)}KB`);
  });

  test('should create output directories', () => {
    const outputDir = path.join(process.cwd(), 'output');
    const tmpDir = path.join(process.cwd(), 'tmp');
    
    // Nettoyer et recréer
    [outputDir, tmpDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    });
    
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(tmpDir)).toBe(true);
    
    console.log('✅ Répertoires de sortie créés');
  });

  test('should load processors modules', async () => {
    // Test que les fichiers existent
    const processorFiles = [
      'src/lib/processors/master-part.ts',
      'src/lib/processors/master-part-all.ts'
    ];
    
    processorFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
    
    console.log('✅ Fichiers processeurs trouvés');
  });

  test('should load utility modules', async () => {
    // Test que les fichiers utilitaires existent
    const utilFiles = [
      'src/lib/utils/csv.ts',
      'src/lib/utils/archive.ts',
      'src/lib/utils/logger.ts'
    ];
    
    utilFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
    
    console.log('✅ Fichiers utilitaires trouvés');
  });

  test('should validate file structure', () => {
    // Vérifier que les fichiers clés existent
    const keyFiles = [
      'src/lib/processors/master-part.ts',
      'src/lib/processors/master-part-all.ts',
      'src/lib/processors/eng-structure.ts',
      'src/lib/processors/technical-specs.ts',
      'src/lib/processors/inventory-part.ts',
      'src/lib/processors/inventory-part-plan.ts',
      'src/lib/utils/csv.ts',
      'src/lib/utils/excel.ts',
      'src/lib/utils/archive.ts',
      'src/lib/types/migration.ts'
    ];
    
    let existingFiles = 0;
    keyFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        existingFiles++;
      } else {
        console.warn(`⚠️  Fichier manquant: ${file}`);
      }
    });
    
    expect(existingFiles).toBeGreaterThan(8); // Au moins 8 fichiers sur 10
    console.log(`✅ Structure de fichiers: ${existingFiles}/${keyFiles.length} fichiers trouvés`);
  });
});
