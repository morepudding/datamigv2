# Script pour analyser la structure du fichier CSV
$csvFile = "JY5MB_complete_boat_20250428_0927CEST(in).csv"

Write-Host "Analyse de la structure du fichier CSV : $csvFile"
Write-Host "=" * 60

try {
    # Lire la première ligne (header)
    $firstLine = Get-Content $csvFile -TotalCount 1
    Write-Host "Première ligne (headers) :"
    Write-Host $firstLine
    Write-Host ""
    
    # Import du CSV avec détection automatique du délimiteur
    $csvData = Import-Csv $csvFile -Delimiter ','
    
    # Afficher les colonnes disponibles
    if ($csvData.Count -gt 0) {
        $properties = ($csvData[0] | Get-Member -MemberType NoteProperty).Name
        Write-Host "Colonnes disponibles ($($properties.Count)) :"
        for ($i = 0; $i -lt $properties.Count; $i++) {
            Write-Host "$($i+1). $($properties[$i])"
        }
        
        Write-Host ""
        Write-Host "Échantillon des 3 premières lignes :"
        Write-Host ""
        
        # Afficher State, Revision et quelques autres colonnes importantes
        $relevantColumns = @('Number', 'State', 'Revision', 'Name')
        
        for ($i = 0; $i -lt [Math]::Min(3, $csvData.Count); $i++) {
            Write-Host "Ligne $($i+1) :"
            foreach ($col in $relevantColumns) {
                if ($properties -contains $col) {
                    $value = $csvData[$i].$col
                    if ([string]::IsNullOrWhiteSpace($value)) { $value = "[VIDE]" }
                    Write-Host "  $col : $value"
                }
            }
            Write-Host ""
        }
    }
    
} catch {
    Write-Host "Erreur lors de l'analyse : $($_.Exception.Message)"
    Write-Host "Stack trace : $($_.Exception.StackTrace)"
}