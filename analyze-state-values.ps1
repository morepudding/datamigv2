# Script pour analyser les valeurs State dans le fichier CSV
$csvFile = "JY5MB_complete_boat_20250428_0927CEST(in).csv"

Write-Host "Analyse des valeurs State dans $csvFile"
Write-Host "=" * 50

try {
    # Import du CSV avec détection automatique du délimiteur
    $csvData = Import-Csv $csvFile -Delimiter ','
    
    # Grouper par State et compter
    $stateValues = $csvData | Group-Object -Property 'State' | Sort-Object Count -Descending
    
    Write-Host "Valeurs State trouvées :"
    Write-Host ""
    
    foreach ($group in $stateValues) {
        $stateName = if ([string]::IsNullOrWhiteSpace($group.Name)) { "[VIDE]" } else { $group.Name }
        Write-Host "$stateName : $($group.Count)"
    }
    
    Write-Host ""
    Write-Host "Total d'enregistrements : $($csvData.Count)"
    
} catch {
    Write-Host "Erreur lors de l'analyse : $($_.Exception.Message)"
}