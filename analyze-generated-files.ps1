# Script pour analyser les valeurs State dans les fichiers générés
$outputDir = "output"

Write-Host "ANALYSE DES VALEURS STATE DANS LES FICHIERS GÉNÉRÉS"
Write-Host "=" * 60

try {
    # Analyser le fichier master_part
    $masterPartFile = "$outputDir/01_L_PARTS_MD_004_CNB_PR4LC_WOOD.csv"
    
    if (Test-Path $masterPartFile) {
        Write-Host "📄 Analyse du fichier: $masterPartFile"
        Write-Host ""
        
        # Import du CSV
        $csvData = Import-Csv $masterPartFile -Delimiter ';'
        
        Write-Host "📊 Statistiques générales:"
        Write-Host "  - Nombre de lignes: $($csvData.Count)"
        Write-Host "  - Nombre de colonnes: $($csvData[0].PSObject.Properties.Count)"
        Write-Host ""
        
        # Afficher les colonnes disponibles
        $columns = $csvData[0].PSObject.Properties.Name
        Write-Host "🏷️ Colonnes disponibles (premières 10):"
        for ($i = 0; $i -lt [Math]::Min(10, $columns.Count); $i++) {
            Write-Host "  $($i+1). $($columns[$i])"
        }
        Write-Host ""
        
        # Chercher une colonne qui pourrait contenir des informations sur State
        $potentialStateColumns = $columns | Where-Object { $_ -match "(State|Status|Etat)" }
        
        if ($potentialStateColumns) {
            Write-Host "🔍 Colonnes potentielles pour State:"
            foreach ($col in $potentialStateColumns) {
                Write-Host "  - $col"
                $values = $csvData | Group-Object -Property $col | Sort-Object Count -Descending | Select-Object -First 5
                foreach ($val in $values) {
                    $name = if ([string]::IsNullOrWhiteSpace($val.Name)) { "[VIDE]" } else { $val.Name }
                    Write-Host "    $name : $($val.Count)"
                }
                Write-Host ""
            }
        }
        
        # Analyser le fichier eng_part_structure pour les enfants sans parents
        Write-Host ""
        Write-Host "🔍 ANALYSE ENG_PART_STRUCTURE"
        Write-Host "-" * 40
        
        $engStructFile = "$outputDir/02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv"
        if (Test-Path $engStructFile) {
            $engData = Import-Csv $engStructFile -Delimiter ';'
            Write-Host "📊 Lignes dans ENG_PART_STRUCTURE: $($engData.Count)"
            
            # Afficher les colonnes
            $engColumns = $engData[0].PSObject.Properties.Name
            Write-Host "🏷️ Colonnes ENG_PART_STRUCTURE:"
            foreach ($col in $engColumns) {
                Write-Host "  - $col"
            }
            
            # Analyser les relations parent-enfant
            if ($engColumns -contains "PARENT_PART_NO" -and $engColumns -contains "PART_NO") {
                Write-Host ""
                Write-Host "🔗 Analyse des relations parent-enfant:"
                
                # Compter les enfants sans parents
                $childrenWithoutParents = $engData | Where-Object { [string]::IsNullOrWhiteSpace($_."PARENT_PART_NO") -or $_."PARENT_PART_NO" -eq "" }
                Write-Host "  - Enfants sans parent: $($childrenWithoutParents.Count)"
                
                # Compter les parents uniques
                $uniqueParents = ($engData | Where-Object { ![string]::IsNullOrWhiteSpace($_."PARENT_PART_NO") } | Group-Object -Property "PARENT_PART_NO").Count
                Write-Host "  - Parents uniques: $uniqueParents"
                
                # Afficher quelques exemples d'enfants sans parents
                if ($childrenWithoutParents.Count -gt 0) {
                    Write-Host ""
                    Write-Host "📋 Exemples d'enfants sans parents (5 premiers):"
                    $childrenWithoutParents | Select-Object -First 5 | ForEach-Object {
                        Write-Host "  - PART_NO: $($_."PART_NO"), PARENT: '$($_."PARENT_PART_NO")'"
                    }
                }
            }
        }
        
    } else {
        Write-Host "❌ Fichier non trouvé: $masterPartFile"
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'analyse: $($_.Exception.Message)"
    Write-Host "Stack trace: $($_.Exception.StackTrace)"
}