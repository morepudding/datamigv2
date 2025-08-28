import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePaths, projectCode } = body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni pour l\'archive' },
        { status: 400 }
      );
    }

    // Créer un stream pour l'archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Créer un ReadableStream à partir de l'archive
    const chunks: Buffer[] = [];
    
    const promise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      archive.on('error', reject);
    });

    // Ajouter les fichiers existants
    const fs = require('fs');
    console.log(`Tentative d'archivage de ${filePaths.length} fichiers:`);
    
    let filesAdded = 0;
    
    for (const filePath of filePaths) {
      try {
        console.log(`Vérification fichier: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log(`✅ Fichier trouvé: ${filePath} (${stats.size} bytes)`);
          
          const fileName = require('path').basename(filePath);
          archive.file(filePath, { name: fileName });
          filesAdded++;
        } else {
          console.log(`❌ Fichier non trouvé: ${filePath}`);
        }
      } catch (error) {
        console.error(`Erreur avec fichier ${filePath}:`, error);
      }
    }
    
    console.log(`📦 ${filesAdded} fichiers ajoutés à l'archive sur ${filePaths.length}`);
    
    if (filesAdded === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier trouvé pour créer l\'archive' },
        { status: 404 }
      );
    }

    archive.finalize();
    
    const archiveBuffer = await promise;
    const filename = `migration_${projectCode}_${Date.now()}.zip`;

    return new Response(new Uint8Array(archiveBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': archiveBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'archive:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'archive' },
      { status: 500 }
    );
  }
}
