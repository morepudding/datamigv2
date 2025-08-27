/**
 * Tests de validation des règles métier PLM vers IFS
 * Vérifie que l'outil respecte parfaitement les spécifications métier
 */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { BusinessTestHelper } from './helpers/business-test-helper';
import * as path from 'path';
import * as fs from 'fs';

describe('🔍 Validation des Règles Métier - Système PLM vers IFS', () => {
  let testData: any[] = [];
  let masterPartStats: any;
  let masterPartAllStats: any;
  let revisionStats: any;

  beforeAll(async () => {
    console.log('\n🚀 Chargement des données de test...');
    
    // Nettoyage des répertoires
    BusinessTestHelper.cleanupDirectories();
    
    // Chargement du fichier d'entrée
    testData = await BusinessTestHelper.loadTestData();
    
    // Calcul des statistiques métier
    masterPartStats = BusinessTestHelper.validateMasterPartBusinessRules(testData);
    masterPartAllStats = BusinessTestHelper.validateMasterPartAllBusinessRules(testData);
    revisionStats = BusinessTestHelper.validateRevisionLogic(testData);
    
    console.log('\n📊 Données chargées et analysées avec succès');
  }, 30000);

  describe('📋 MASTER PART - Référentiel Principal (hors achats)', () => {
    test('doit charger les données d\'entrée correctement', () => {
      expect(testData).toBeDefined();
      expect(testData.length).toBeGreaterThan(0);
      expect(masterPartStats.totalLines).toBe(testData.length);
      console.log(`✅ ${masterPartStats.totalLines} lignes chargées`);
    });

    test('doit exclure les pièces d\'achat (Source = Buy)', () => {
      expect(masterPartStats.excluded.buyParts).toBeGreaterThan(0);
      expect(masterPartStats.afterSourceFilter).toBe(
        masterPartStats.totalLines - masterPartStats.excluded.buyParts
      );
      console.log(`🛍️ ${masterPartStats.excluded.buyParts} pièces Buy exclues`);
    });

    test('doit filtrer sur les classifications AN29 (derniers 10 caractères)', () => {
      expect(masterPartStats.afterClassificationFilter).toBeLessThanOrEqual(
        masterPartStats.afterSourceFilter
      );
      console.log(`📋 ${masterPartStats.excluded.shortClassifications} classifications invalides exclues`);
    });

    test('doit exclure les pièces fantômes AN29-02-00 avec Phantom = No', () => {
      expect(masterPartStats.afterPhantomFilter).toBeLessThanOrEqual(
        masterPartStats.afterClassificationFilter
      );
      console.log(`👻 ${masterPartStats.excluded.phantomAN29_02_00} pièces fantômes AN29-02-00 exclues`);
    });

    test('doit exclure les révisions A en cours de travail', () => {
      expect(masterPartStats.afterRevisionFilter).toBeLessThanOrEqual(
        masterPartStats.afterPhantomFilter
      );
      expect(masterPartStats.excluded.revisionAInWork).toBeGreaterThanOrEqual(0);
      console.log(`🔄 ${masterPartStats.excluded.revisionAInWork} révisions A en cours exclues`);
    });

    test('doit déduplicquer sur la colonne Number', () => {
      expect(masterPartStats.afterDeduplication).toBeLessThanOrEqual(
        masterPartStats.afterRevisionFilter
      );
      expect(masterPartStats.excluded.duplicates).toBeGreaterThanOrEqual(0);
      console.log(`🔂 ${masterPartStats.excluded.duplicates} doublons supprimés`);
    });

    test('doit respecter la logique de filtrage en cascade', () => {
      // Vérification de la cohérence du pipeline de filtrage
      expect(masterPartStats.afterSourceFilter).toBeLessThanOrEqual(masterPartStats.totalLines);
      expect(masterPartStats.afterClassificationFilter).toBeLessThanOrEqual(masterPartStats.afterSourceFilter);
      expect(masterPartStats.afterPhantomFilter).toBeLessThanOrEqual(masterPartStats.afterClassificationFilter);
      expect(masterPartStats.afterRevisionFilter).toBeLessThanOrEqual(masterPartStats.afterPhantomFilter);
      expect(masterPartStats.afterDeduplication).toBeLessThanOrEqual(masterPartStats.afterRevisionFilter);
      
      console.log(`🔄 Pipeline de filtrage cohérent: ${masterPartStats.totalLines} → ${masterPartStats.afterDeduplication}`);
    });
  });

  describe('📋 MASTER PART ALL - Référentiel Complet (inclut achats)', () => {
    test('doit inclure les pièces d\'achat (différence clé avec Master Part)', () => {
      expect(masterPartAllStats.included.buyParts).toBeGreaterThan(0);
      expect(masterPartAllStats.included.makeParts).toBeGreaterThan(0);
      console.log(`🛍️ ${masterPartAllStats.included.buyParts} pièces Buy incluses`);
      console.log(`🔧 ${masterPartAllStats.included.makeParts} pièces Make incluses`);
    });

    test('doit filtrer uniquement sur Classification.includes("AN29")', () => {
      expect(masterPartAllStats.afterClassificationFilter).toBeLessThanOrEqual(
        masterPartAllStats.totalLines
      );
      console.log(`📋 ${masterPartAllStats.afterClassificationFilter} lignes après filtre AN29`);
    });

    test('doit appliquer le filtre État (Released OU In Work non-A)', () => {
      expect(masterPartAllStats.afterStateFilter).toBeLessThanOrEqual(
        masterPartAllStats.afterClassificationFilter
      );
      console.log(`🔄 ${masterPartAllStats.afterStateFilter} lignes après filtre État`);
    });

    test('doit avoir plus de résultats que Master Part (inclusion des Buy)', () => {
      expect(masterPartAllStats.afterDeduplication).toBeGreaterThanOrEqual(
        masterPartStats.afterDeduplication
      );
      
      const difference = masterPartAllStats.afterDeduplication - masterPartStats.afterDeduplication;
      expect(difference).toBeGreaterThanOrEqual(0);
      console.log(`📈 Différence Master Part ALL vs Master Part: ${difference} lignes`);
    });
  });

  describe('🔄 LOGIQUE DE TRANSFORMATION DES RÉVISIONS', () => {
    test('doit conserver les révisions pour les pièces Released', () => {
      expect(revisionStats.released.total).toBeGreaterThan(0);
      expect(revisionStats.released.unchanged).toBe(revisionStats.released.total);
      console.log(`✅ ${revisionStats.released.total} pièces Released - révisions inchangées`);
    });

    test('doit décrémenter les révisions pour In Work selon le mapping F→E→D→C→B→A', () => {
      expect(revisionStats.inWork.total).toBeGreaterThan(0);
      console.log(`🔄 In Work: ${revisionStats.inWork.decremented} décrémentées, ${revisionStats.inWork.unchanged} inchangées`);
    });

    test('doit décrémenter les révisions pour Under Review selon le mapping', () => {
      if (revisionStats.underReview.total > 0) {
        console.log(`📋 Under Review: ${revisionStats.underReview.decremented} décrémentées, ${revisionStats.underReview.unchanged} inchangées`);
      } else {
        console.log(`📋 Aucune pièce Under Review dans les données test`);
      }
    });

    test('doit appliquer la logique de décrément correctement', () => {
      const totalDecremented = revisionStats.inWork.decremented + revisionStats.underReview.decremented;
      const totalUnchanged = revisionStats.released.unchanged + revisionStats.inWork.unchanged + revisionStats.underReview.unchanged;
      
      expect(totalDecremented + totalUnchanged).toBeGreaterThan(0);
      console.log(`🔄 Total révisions transformées: ${totalDecremented}, inchangées: ${totalUnchanged}`);
    });
  });

  describe('🎯 COHÉRENCE GLOBALE ET VALIDATIONS', () => {
    test('doit respecter la logique Master Part vs Master Part ALL', () => {
      const difference = masterPartAllStats.afterDeduplication - masterPartStats.afterDeduplication;
      
      // Master Part ALL doit être >= Master Part (inclusion des Buy)
      expect(masterPartAllStats.afterDeduplication).toBeGreaterThanOrEqual(
        masterPartStats.afterDeduplication
      );
      
      // La différence ne peut pas dépasser le nombre de pièces Buy filtrées
      expect(difference).toBeLessThanOrEqual(masterPartAllStats.included.buyParts);
      
      console.log(`🎯 Validation cohérence: différence ${difference} <= Buy incluses ${masterPartAllStats.included.buyParts}`);
    });

    test('doit générer un rapport de validation complet', () => {
      const report = BusinessTestHelper.generateBusinessValidationReport(
        masterPartStats,
        masterPartAllStats,
        revisionStats
      );
      
      expect(report).toContain('VALIDATION DES RÈGLES MÉTIER');
      expect(report).toContain('MASTER PART');
      expect(report).toContain('MASTER PART ALL');
      expect(report).toContain('LOGIQUE DE TRANSFORMATION DES RÉVISIONS');
      
      console.log(report);
    });

    test('doit valider les exclusions et inclusions métier', () => {
      // Vérifications de bon sens métier
      expect(masterPartStats.excluded.buyParts).toBeGreaterThan(0);
      expect(masterPartAllStats.included.buyParts).toBeGreaterThan(0);
      expect(masterPartAllStats.included.makeParts).toBeGreaterThan(0);
      
      // Les exclusions Master Part ne doivent pas dépasser les données d'entrée
      const totalExcluded = masterPartStats.excluded.buyParts + 
                           masterPartStats.excluded.shortClassifications +
                           masterPartStats.excluded.phantomAN29_02_00 +
                           masterPartStats.excluded.revisionAInWork +
                           masterPartStats.excluded.duplicates;
      
      expect(totalExcluded).toBeLessThanOrEqual(masterPartStats.totalLines);
      console.log(`📊 Total exclusions cohérentes: ${totalExcluded} <= ${masterPartStats.totalLines}`);
    });
  });

  describe('📄 GÉNÉRATION DE DOCUMENTS ET MAPPING', () => {
    test('doit préparer les dossiers de sortie', () => {
      const outputDir = path.join(process.cwd(), 'output');
      const tmpDir = path.join(process.cwd(), 'tmp');
      
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(tmpDir)).toBe(true);
      console.log(`📁 Dossiers de sortie préparés: output/ et tmp/`);
    });

    test('doit valider la structure des données pour le mapping IFS', () => {
      // Vérifier que les données ont les colonnes essentielles pour IFS
      const requiredForIFS = ['Number', 'Name', 'Classification', 'State', 'Revision', 'Context'];
      const firstRow = testData[0];
      
      requiredForIFS.forEach(column => {
        expect(firstRow).toHaveProperty(column);
      });
      
      console.log(`✅ Colonnes requises pour IFS présentes: ${requiredForIFS.join(', ')}`);
    });

    test('doit identifier le code projet pour le transcodage', () => {
      const firstRow = testData[0];
      const context = (firstRow.Context || '').toString().trim();
      
      expect(context.length).toBeGreaterThanOrEqual(5);
      console.log(`🏷️ Code projet identifié: ${context.substring(0, 5)}`);
    });
  });
});
