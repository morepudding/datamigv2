# Script pour extraire les valeurs State du fichier CSV brut
$csvFile = "JY5MB_complete_boat_20250428_0927CEST(in).csv"

Write-Host "Extraction des valeurs State du fichier CSV brut"
Write-Host "=" * 50

try {
    # Lire toutes les lignes du fichier
    $allLines = Get-Content $csvFile
    
    Write-Host "Nombre total de lignes : $($allLines.Count)"
    
    # Dictionnaire pour compter les valeurs State
    $stateCount = @{}
    
    # Pattern pour extraire les valeurs State
    # Rechercher les patterns comme "Released", "In Work", "Obsolete", etc.
    $statePatterns = @("Released", "In Work", "Obsolete", "Under Review", "Preliminary", "Canceled")
    
    foreach ($line in $allLines) {
        foreach ($pattern in $statePatterns) {
            if ($line -match "`"$pattern`"") {
                if ($stateCount.ContainsKey($pattern)) {
                    $stateCount[$pattern]++
                } else {
                    $stateCount[$pattern] = 1
                }
                break  # Une seule correspondance par ligne
            }
        }
    }
    
    Write-Host ""
    Write-Host "Valeurs State détectées :"
    
    if ($stateCount.Count -eq 0) {
        Write-Host "Aucune valeur State standard détectée."
        Write-Host ""
        Write-Host "Recherche de toutes les valeurs entre guillemets dans la position State..."
        
        # Analyser quelques lignes pour comprendre la structure
        Write-Host ""
        Write-Host "Échantillon des 5 premières lignes de données :"
        for ($i = 1; $i -lt [Math]::Min(6, $allLines.Count); $i++) {
            $line = $allLines[$i]
            Write-Host "Ligne $i : $($line.Substring(0, [Math]::Min(100, $line.Length)))..."
            
            # Essayer d'extraire les champs séparés par des virgules
            $fields = $line -split '","'
            if ($fields.Count -gt 6) {
                Write-Host "  Field 6 (State potentiel) : $($fields[6])"
            }
        }
        
    } else {
        $sortedStates = $stateCount.GetEnumerator() | Sort-Object Value -Descending
        foreach ($state in $sortedStates) {
            Write-Host "$($state.Key) : $($state.Value)"
        }
        
        $total = ($stateCount.Values | Measure-Object -Sum).Sum
        Write-Host ""
        Write-Host "Total des lignes avec valeurs State : $total"
        Write-Host "Lignes sans valeur State identifiée : $($allLines.Count - 1 - $total)"
    }
    
} catch {
    Write-Host "Erreur lors de l'analyse : $($_.Exception.Message)"
}