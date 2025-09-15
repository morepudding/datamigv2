# Script pour analyser le fichier CSV avec différents délimiteurs
$csvFile = "JY5MB_complete_boat_20250428_0927CEST(in).csv"

Write-Host "Analyse avancée du fichier CSV : $csvFile"
Write-Host "=" * 60

try {
    # Tester différents délimiteurs
    $delimiters = @(',', ';', '`t')
    
    foreach ($delimiter in $delimiters) {
        Write-Host "Test avec délimiteur '$delimiter' :"
        
        try {
            $csvData = Import-Csv $csvFile -Delimiter $delimiter
            
            if ($csvData.Count -gt 0) {
                $properties = ($csvData[0] | Get-Member -MemberType NoteProperty).Name
                Write-Host "  Nombre de colonnes : $($properties.Count)"
                Write-Host "  Nombre de lignes : $($csvData.Count)"
                
                # Chercher la colonne State
                $stateColumn = $properties | Where-Object { $_ -match "State" }
                if ($stateColumn) {
                    Write-Host "  Colonne State trouvée : '$stateColumn'"
                    
                    # Analyser les valeurs State
                    $stateValues = $csvData | Group-Object -Property $stateColumn | Sort-Object Count -Descending | Select-Object -First 10
                    Write-Host "  Top 10 des valeurs State :"
                    foreach ($group in $stateValues) {
                        $stateName = if ([string]::IsNullOrWhiteSpace($group.Name)) { "[VIDE]" } else { $group.Name }
                        Write-Host "    $stateName : $($group.Count)"
                    }
                } else {
                    Write-Host "  Colonnes disponibles (5 premières) :"
                    $firstFive = $properties | Select-Object -First 5
                    foreach ($col in $firstFive) {
                        Write-Host "    - $col"
                    }
                }
                
                Write-Host ""
                if ($properties.Count -gt 5) { break }  # Si on a trouvé une bonne structure
            }
        } catch {
            Write-Host "  Erreur avec ce délimiteur : $($_.Exception.Message)"
        }
        
        Write-Host ""
    }
    
} catch {
    Write-Host "Erreur générale : $($_.Exception.Message)"
}