# upload-and-get-fixed.ps1
# PowerShell 5.1 compatible script to upload three FET XML files and re-use the session cookie
# Usage: edit the three paths below, then run from PowerShell:
#   powershell -ExecutionPolicy Bypass -NoExit -File "C:\Users\Aissa\...\scripts\upload-and-get-fixed.ps1"

# Remplacez ces chemins par vos fichiers réels
$teachersPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\Fet_24692N_2A_18_Ar_result_activities.xml"
$subgroupsPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\Fet_24692N_2A_18_Ar_result_subgroups.xml"
$activitiesPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\Fet_24692N_2A_18_Ar_result_activities.xml"
# Vérifier que les fichiers existent
if (!(Test-Path $teachersPath)) { Write-Host "teachers.xml introuvable :" $teachersPath; exit 1 }
if (!(Test-Path $subgroupsPath)) { Write-Host "subgroups.xml introuvable :" $subgroupsPath; exit 1 }
if (!(Test-Path $activitiesPath)) { Write-Host "activities.xml introuvable :" $activitiesPath; exit 1 }

# Tenter de charger l'assembly System.Net.Http nécessaire
try {
    Add-Type -AssemblyName "System.Net.Http" -ErrorAction Stop
} catch {
    Write-Host "Impossible de charger System.Net.Http. Essayez :"
    Write-Host " - installer PowerShell 7, ou"
    Write-Host " - utiliser curl.exe (commande fournie auparavant)."
    Write-Host "Détail erreur: $($_.Exception.Message)"
    exit 2
}

# Préparer client avec CookieContainer
$cookieContainer = New-Object System.Net.CookieContainer
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.CookieContainer = $cookieContainer
$handler.UseCookies = $true
$handler.AllowAutoRedirect = $true

$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [System.TimeSpan]::FromMinutes(5)

$uriUpload = "https://timetableedtforfet-production.up.railway.app/api/upload"
$uriTeachers = "https://timetableedtforfet-production.up.railway.app/api/teachers"

# Construire le multipart/form-data
$multipart = New-Object System.Net.Http.MultipartFormDataContent

function Add-FileToMultipart([string]$path, [string]$fieldName) {
    # Lire le fichier en tant que tableau d'octets
    $bytes = [System.IO.File]::ReadAllBytes($path)
    # Utiliser le constructeur statique pour éviter que PowerShell n'expande le tableau en plusieurs arguments
    $content = [System.Net.Http.ByteArrayContent]::new($bytes)
    # Ajouter au multipart en précisant le nom du champ et le nom de fichier — la méthode Add va définir Content-Disposition correctement
    $filename = [System.IO.Path]::GetFileName($path)
    $multipart.Add($content, $fieldName, $filename)
}

Add-FileToMultipart $teachersPath "teachersXml"
Add-FileToMultipart $subgroupsPath "subgroupsXml"
Add-FileToMultipart $activitiesPath "activitiesXml"

Write-Host "Envoi POST vers $uriUpload ..."
$response = $client.PostAsync($uriUpload, $multipart).Result
Write-Host "Status POST:" $response.StatusCode

$body = $response.Content.ReadAsStringAsync().Result
Write-Host "`nCorps de la réponse POST:`n"
Write-Host $body

# Afficher cookie TIMETABLE_SESSION s'il est présent
$cookies = $cookieContainer.GetCookies([Uri]$uriUpload)
if ($cookies.Count -gt 0) {
    Write-Host "`nCookies reçus pour le domaine:" ([Uri]$uriUpload).Host
    $cookies | ForEach-Object { Write-Host ("  {0} = {1} (domain={2}; path={3})" -f $_.Name, $_.Value, $_.Domain, $_.Path) }
} else {
    Write-Host "`nAucun cookie reçu (vérifier la réponse d'upload)."
}

# GET /api/teachers en réutilisant la même session (CookieContainer)
Write-Host "`nRequête GET -> /api/teachers ..."
$response2 = $client.GetAsync($uriTeachers).Result
Write-Host "Status GET:" $response2.StatusCode
$body2 = $response2.Content.ReadAsStringAsync().Result
Write-Host "`nCorps de la réponse GET /api/teachers:`n"
Write-Host $body2

Read-Host "Appuyez sur Entrée pour fermer..."
