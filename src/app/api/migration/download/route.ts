import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const filePath = url.searchParams.get('path');

    if (!type || !filePath) {
      return NextResponse.json(
        { error: 'Paramètres manquants: type et path requis' },
        { status: 400 }
      );
    }

    // Validation du chemin pour éviter les attaques de type directory traversal
    const absolutePath = path.resolve(filePath);
    const allowedDirs = [
      path.resolve(process.cwd(), 'output'),
      path.resolve(process.cwd(), 'tmp'),
      '/tmp' // Vercel tmp directory
    ];

    const isPathAllowed = allowedDirs.some(allowedDir => 
      absolutePath.startsWith(allowedDir)
    ) || absolutePath.startsWith('/tmp'); // Direct tmp check for Vercel

    if (!isPathAllowed) {
      return NextResponse.json(
        { error: 'Chemin de fichier non autorisé' },
        { status: 403 }
      );
    }

    // Vérifier que le fichier existe
    try {
      await stat(absolutePath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      );
    }

    // Lire le fichier
    const fileBuffer = await readFile(absolutePath);
    
    // Déterminer le type de contenu et le nom de fichier
    let contentType = 'application/octet-stream';
    let filename = path.basename(absolutePath);
    
    if (type === 'csv') {
      contentType = 'text/csv';
    } else if (type === 'archive' && filename.endsWith('.zip')) {
      contentType = 'application/zip';
    }

    // Retourner le fichier
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
