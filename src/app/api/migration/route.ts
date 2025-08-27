import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import * as xlsx from 'xlsx';
import type { 
  InputRow, 
  ProcessingResult, 
  ArchiveResult,
  ProcessingMetrics,
  ValidationResult 
} from '@/lib/types/migration';
import { validateInputData } from '@/lib/utils/validation';
import { createZipArchive } from '@/lib/utils/archive';
import logger from '@/lib/utils/logger';

// Import des vrais processeurs - Phase 3
import {
  MasterPartProcessor,
  MasterPartAllProcessor,
  TechnicalSpecsProcessor,
  EngStructureProcessor,
  InventoryPartProcessor,
  InventoryPartPlanProcessor
} from '@/lib/processors';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.info('migration', '🚀 Début du traitement de migration PLM vers IFS');

  try {
    // 1. Récupération et validation du fichier uploadé
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      logger.error('migration', 'Aucun fichier fourni dans la requête');
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    logger.info('migration', `📄 Fichier reçu: ${file.name} (${Math.round(file.size / 1024)} KB)`);

    // 2. Sauvegarde temporaire du fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Créer le dossier tmp s'il n'existe pas
    const tmpDir = path.join(process.cwd(), 'tmp');
    try {
      await mkdir(tmpDir, { recursive: true });
    } catch (error) {
      // Le dossier existe déjà
    }
    
    const tempFilePath = path.join(tmpDir, `upload_${Date.now()}_${file.name}`);
    await writeFile(tempFilePath, buffer);
    
    logger.info('migration', `💾 Fichier sauvegardé temporairement: ${tempFilePath}`);

    // 3. Lecture et validation du fichier Excel
    let workbook: xlsx.WorkBook;
    let inputData: InputRow[];
    let projectCode = 'XXXXX';

    try {
      workbook = xlsx.readFile(tempFilePath);
      const sheetName = workbook.SheetNames[0];
      inputData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      
      logger.info('migration', `📊 Données lues: ${inputData.length} lignes, ${Object.keys(inputData[0] || {}).length} colonnes`);
      
      // Extraction du code projet depuis la première ligne
      if (inputData.length > 0 && inputData[0]['Context']) {
        const context = inputData[0]['Context'].toString().trim();
        if (context.length >= 5) {
          projectCode = context.substring(0, 5);
          logger.info('migration', `🏷️ Code projet détecté: ${projectCode}`);
        }
      }
    } catch (error) {
      logger.error('migration', 'Erreur lors de la lecture du fichier Excel: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      await cleanupTempFile(tempFilePath);
      return NextResponse.json(
        { error: 'Erreur lors de la lecture du fichier Excel. Vérifiez le format.' },
        { status: 400 }
      );
    }

    // 4. Validation des données
    const validationResult: ValidationResult = validateInputData(inputData);
    if (!validationResult.isValid) {
      logger.error('migration', `❌ Validation échouée: ${validationResult.errors.length} erreurs`);
      await cleanupTempFile(tempFilePath);
      return NextResponse.json({
        error: 'Données invalides',
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings
      }, { status: 400 });
    }

    if (validationResult.warnings.length > 0) {
      logger.warn('migration', `⚠️ ${validationResult.warnings.length} avertissement(s) de validation détecté(s)`);
    }

    // 5. Traitement des modules en séquence
    const processingResults: ProcessingResult[] = [];
    const outputDir = path.join(process.cwd(), 'output');
    
    // Créer le dossier output s'il n'existe pas
    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Le dossier existe déjà
    }

    // Configuration des modules dans l'ordre de dépendance OBLIGATOIRE
    const modules = [
      { 
        name: 'master-part', 
        displayName: 'Master Part (Référentiel principal)',
        processor: new MasterPartProcessor(),
        outputFileName: 'master_part.csv'
      },
      { 
        name: 'master-part-all', 
        displayName: 'Master Part ALL (Référentiel complet)',
        processor: new MasterPartAllProcessor(),
        outputFileName: 'master_part_all.csv'
      },
      { 
        name: 'technical-specs', 
        displayName: 'Technical Spec Values (Spécifications techniques)',
        processor: new TechnicalSpecsProcessor(),
        outputFileName: 'technical_spec_values.csv'
      },
      { 
        name: 'eng-structure', 
        displayName: 'Eng Part Structure (Structure nomenclature)',
        processor: new EngStructureProcessor(),
        outputFileName: 'eng_part_structure.csv'
      },
      { 
        name: 'inventory-part', 
        displayName: 'Inventory Part (Gestion stocks)',
        processor: new InventoryPartProcessor(),
        outputFileName: 'inventory_part.csv'
      },
      { 
        name: 'inventory-plan', 
        displayName: 'Inventory Part Plan (Planification stocks)',
        processor: new InventoryPartPlanProcessor(),
        outputFileName: 'inventory_part_plan.csv'
      }
    ];

    // PHASE 3 : Traitement réel avec les vrais processeurs
    for (const module of modules) {
      const moduleStartTime = Date.now();
      logger.info('migration', `🔄 Traitement du module: ${module.displayName}`);
      
      try {
        // Chemin de sortie pour le module
        const outputPath = path.join(outputDir, module.outputFileName);
        
        // Traitement avec le vrai processeur
        const result = await module.processor.process(inputData, outputPath);
        
        processingResults.push(result);
        
        if (result.success) {
          logger.info('migration', `✅ Module ${module.displayName} terminé: ${result.rowsOutput} lignes en ${result.processingTime}ms`);
        } else {
          logger.error('migration', `❌ Échec du module ${module.displayName}: ${result.errors.join(', ')}`);
        }
        
      } catch (error) {
        logger.error('migration', `💥 Erreur critique dans le module ${module.displayName}: ` + (error instanceof Error ? error.message : 'Erreur inconnue'));
        const result: ProcessingResult = {
          success: false,
          module: module.name,
          rowsInput: inputData.length,
          rowsOutput: 0,
          outputPath: '',
          processingTime: Date.now() - moduleStartTime,
          errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
          warnings: []
        };
        processingResults.push(result);
        
        // En cas d'erreur critique, on continue les autres modules mais on le signale
        logger.warn('migration', `⚠️ Poursuite du traitement malgré l'erreur dans ${module.displayName}`);
      }
    }

    // Génération des chemins de fichiers pour l'archive
    const filePaths = processingResults.map(result => result.outputPath);
    const archiveResult: ArchiveResult = await createZipArchive(filePaths, projectCode);
    
    // 7. Calcul des métriques finales
    const totalProcessingTime = Date.now() - startTime;
    const metrics: ProcessingMetrics = {
      totalRows: inputData.length,
      totalProcessingTime,
      memoryUsage: process.memoryUsage().heapUsed,
      fileSizes: {},
      errorCount: processingResults.reduce((sum, r) => sum + r.errors.length, 0),
      warningCount: processingResults.reduce((sum, r) => sum + r.warnings.length, 0),
      moduleMetrics: {}
    };

    // Nettoyage du fichier temporaire
    await cleanupTempFile(tempFilePath);
    
    logger.info('migration', `🎉 Traitement terminé avec succès en ${totalProcessingTime}ms`);
    logger.info('migration', `📊 Statistiques: ${metrics.totalRows} lignes, ${processingResults.length} modules, ${metrics.errorCount} erreurs, ${metrics.warningCount} avertissements`);

    // 8. Retour de la réponse
    return NextResponse.json({
      success: true,
      projectCode,
      processingResults,
      archiveResult,
      metrics,
      validationWarnings: validationResult.warnings
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('migration', `💥 Erreur fatale après ${totalTime}ms: ` + (error instanceof Error ? error.message : 'Erreur inconnue'));
    
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// Fonction utilitaire pour nettoyer les fichiers temporaires
async function cleanupTempFile(filePath: string) {
  try {
    await unlink(filePath);
    logger.info('migration', `🧹 Fichier temporaire supprimé: ${filePath}`);
  } catch (error) {
    logger.warn('migration', `⚠️ Impossible de supprimer le fichier temporaire: ${filePath} - ` + (error instanceof Error ? error.message : 'Erreur inconnue'));
  }
}

// Endpoint pour récupérer le statut en temps réel (sera implémenté plus tard)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  
  if (type === 'status') {
    // TODO: Implémenter le suivi en temps réel
    return NextResponse.json({
      status: 'idle',
      message: 'Endpoint de statut pas encore implémenté'
    });
  }
  
  return NextResponse.json({
    error: 'Type de requête non supporté'
  }, { status: 400 });
}
