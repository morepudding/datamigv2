// Utilitaires pour la création d'archives ZIP
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { ArchiveResult } from '../types/migration';

/**
 * Crée une archive ZIP contenant les fichiers spécifiés
 */
export async function createZipArchive(
  filePaths: string[],
  outputPath: string,
  baseDirectory?: string
): Promise<ArchiveResult> {
  return new Promise((resolve, reject) => {
    try {
      // S'assurer que le dossier de destination existe
      const directory = path.dirname(outputPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Créer le stream d'écriture
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression maximale
      });

      let archiveResult: ArchiveResult = {
        success: false,
        archivePath: outputPath,
        archiveSize: 0,
        filesIncluded: [],
        projectCode: ''
      };

      // Gestionnaires d'événements
      output.on('close', () => {
        archiveResult.success = true;
        archiveResult.archiveSize = archive.pointer();
        resolve(archiveResult);
      });

      archive.on('error', (err) => {
        reject(new Error(`Archive creation failed: ${err.message}`));
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn(`File not found during archiving: ${err.message}`);
        } else {
          reject(err);
        }
      });

      // Pipe vers le fichier de sortie
      archive.pipe(output);

      // Ajouter chaque fichier à l'archive
      filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(filePath);
          const relativePath = baseDirectory 
            ? path.relative(baseDirectory, filePath)
            : fileName;

          archive.file(filePath, { name: relativePath });
          archiveResult.filesIncluded.push(fileName);
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      });

      // Finaliser l'archive
      archive.finalize();

    } catch (error) {
      reject(new Error(`Failed to create ZIP archive: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Crée une archive ZIP avec une structure de dossier spécifique pour IFS
 */
export async function createIFSArchive(
  csvFiles: { [key: string]: string },
  projectCode: string,
  outputDirectory: string
): Promise<ArchiveResult> {
  try {
    const folderName = `Import IFS ${projectCode}`;
    const archivePath = path.join(outputDirectory, `${folderName}.zip`);

    // Mapping des fichiers avec leurs noms de destination selon la convention IFS
    const renamedFiles = {
      masterPart: `01_L_PARTS_MD_004_${projectCode}_WOOD.csv`,
      engStructure: `02_L_ENG_PART_STRUCT_${projectCode}_WOOD.csv`,
      technicalSpecs: `03_L_TECHNICAL_CLASS_VALUES_${projectCode}_WOOD.csv`,
      inventoryPart: `04_L_INVENTORY_PART_${projectCode}_WOOD.csv`,
      inventoryPartPlan: `05_L_INVENTORY_PART_PLAN_${projectCode}_WOOD.csv`
    };

    // Créer le dossier temporaire pour structurer l'archive
    const tempFolderPath = path.join(outputDirectory, folderName);
    if (!fs.existsSync(tempFolderPath)) {
      fs.mkdirSync(tempFolderPath, { recursive: true });
    }

    // Copier et renommer les fichiers dans le dossier temporaire
    const copiedFiles: string[] = [];
    
    Object.entries(csvFiles).forEach(([key, originalPath]) => {
      if (fs.existsSync(originalPath)) {
        let destinationName = '';
        
        switch (key) {
          case 'master_part.csv':
            destinationName = renamedFiles.masterPart;
            break;
          case 'eng_part_structure.csv':
            destinationName = renamedFiles.engStructure;
            break;
          case 'technical_spec_values.csv':
            destinationName = renamedFiles.technicalSpecs;
            break;
          case 'inventory_part.csv':
            destinationName = renamedFiles.inventoryPart;
            break;
          case 'inventory_part_plan.csv':
            destinationName = renamedFiles.inventoryPartPlan;
            break;
          default:
            destinationName = path.basename(originalPath);
        }
        
        const destinationPath = path.join(tempFolderPath, destinationName);
        fs.copyFileSync(originalPath, destinationPath);
        copiedFiles.push(destinationPath);
      }
    });

    // Créer l'archive ZIP
    const result = await createZipArchive([tempFolderPath], archivePath);
    result.projectCode = projectCode;

    // Nettoyer le dossier temporaire
    try {
      fs.rmSync(tempFolderPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not clean temporary folder: ${error}`);
    }

    return result;

  } catch (error) {
    throw new Error(`Failed to create IFS archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extrait les informations d'une archive existante
 */
export function getArchiveInfo(archivePath: string): { exists: boolean; size: number; lastModified?: Date } {
  try {
    if (!fs.existsSync(archivePath)) {
      return { exists: false, size: 0 };
    }

    const stats = fs.statSync(archivePath);
    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime
    };
  } catch {
    return { exists: false, size: 0 };
  }
}

/**
 * Supprime une archive si elle existe
 */
export function deleteArchive(archivePath: string): boolean {
  try {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Formate la taille d'un fichier en format lisible
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
