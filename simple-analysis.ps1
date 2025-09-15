# Script simple pour analyser les fichiers générés
$outputDir = "output"

Write-Host "ANALYSE DES FICHIERS GÉNÉRÉS"
Write-Host "=" * 40

# Analyser le fichier master_part
$masterPartFile = "$outputDir/01_L_PARTS_MD_004_CNB_PR4LC_WOOD.csv"

if (Test-Path $masterPartFile) {
    Write-Host "Analyse du fichier master_part:"
    $csvData = Import-Csv $masterPartFile -Delimiter ';'
    Write-Host "  - Nombre de lignes: $($csvData.Count)"
    Write-Host "  - Colonnes: $($csvData[0].PSObject.Properties.Count)"
    
    # Afficher les premières colonnes
    $columns = $csvData[0].PSObject.Properties.Name
    Write-Host "  - Premières colonnes:"
    for ($i = 0; $i -lt [Math]::Min(5, $columns.Count); $i++) {
        Write-Host "    $($i+1). $($columns[$i])"
    }
}

Write-Host ""

# Analyser le fichier eng_part_structure
$engStructFile = "$outputDir/02_L_ENG_PART_STRUCT_PR4LC_WOOD.csv"

if (Test-Path $engStructFile) {
    Write-Host "Analyse du fichier ENG_PART_STRUCTURE:"
    $engData = Import-Csv $engStructFile -Delimiter ';'
    Write-Host "  - Nombre de lignes: $($engData.Count)"
    
    $engColumns = $engData[0].PSObject.Properties.Name
    Write-Host "  - Colonnes ENG_PART_STRUCTURE:"
    foreach ($col in $engColumns) {
        Write-Host "    - $col"
    }
}

Write-Host ""
Write-Host "Analyse terminée."