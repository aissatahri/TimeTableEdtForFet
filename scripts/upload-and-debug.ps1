# upload-and-debug.ps1
# Script complet : upload + GET /api/teachers + GET /api/debug/sessions (tous en une seule session)

# --- Modifier les chemins ici si besoin ---
$teachersPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\teachers.xml"
$subgroupsPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\subgroups.xml"
$activitiesPath = "D:\fet-2026\Hjira-result-01\timetables\Fet_24692N_2A_18_Ar_result-single\activities.xml"

# Vérifier que les fichiers existent
if (!(Test-Path $teachersPath)) { Write-Host "❌ teachers.xml introuvable :" $teachersPath; exit 1 }
if (!(Test-Path $subgroupsPath)) { Write-Host "❌ subgroups.xml introuvable :" $subgroupsPath; exit 1 }
if (!(Test-Path $activitiesPath)) { Write-Host "❌ activities.xml introuvable :" $activitiesPath; exit 1 }

Write-Host "✅ Tous les fichiers trouvés" -ForegroundColor Green

# Tenter de charger l'assembly System.Net.Http nécessaire
try {
    Add-Type -AssemblyName "System.Net.Http" -ErrorAction Stop
} catch {
    Write-Host "❌ Impossible de charger System.Net.Http. Essayez :"
    Write-Host " - installer PowerShell 7, ou"
    Write-Host " - utiliser curl.exe."
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
$uriDebugSessions = "https://timetableedtforfet-production.up.railway.app/api/debug/sessions"

# Construire le multipart/form-data
$multipart = New-Object System.Net.Http.MultipartFormDataContent

function Add-FileToMultipart([string]$path, [string]$fieldName) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $content = [System.Net.Http.ByteArrayContent]::new($bytes)
    $filename = [System.IO.Path]::GetFileName($path)
    $multipart.Add($content, $fieldName, $filename)
}

Add-FileToMultipart $teachersPath "teachersXml"
Add-FileToMultipart $subgroupsPath "subgroupsXml"
Add-FileToMultipart $activitiesPath "activitiesXml"

# ===== ÉTAPE 1 : UPLOAD =====
Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ÉTAPE 1 : Upload des fichiers XML" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Envoi POST vers $uriUpload ..."
$response = $client.PostAsync($uriUpload, $multipart).Result
Write-Host "Status POST:" $response.StatusCode -ForegroundColor $(if($response.StatusCode -eq "OK") { "Green" } else { "Red" })

$body = $response.Content.ReadAsStringAsync().Result
Write-Host "`nCorps de la réponse POST:`n"
Write-Host $body

# Afficher cookie TIMETABLE_SESSION s'il est présent
$cookies = $cookieContainer.GetCookies([Uri]$uriUpload)
if ($cookies.Count -gt 0) {
    Write-Host "`n✅ Cookies reçus pour le domaine:" ([Uri]$uriUpload).Host -ForegroundColor Green
    $cookies | ForEach-Object { Write-Host ("  - {0} = {1}" -f $_.Name, $_.Value.Substring(0, [Math]::Min(20, $_.Value.Length)) + "...") }
} else {
    Write-Host "`n❌ Aucun cookie reçu (vérifier la réponse d'upload)." -ForegroundColor Red
}

# ===== ÉTAPE 2 : GET /api/teachers =====
Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ÉTAPE 2 : GET /api/teachers (réutilisant la même session)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Requête GET -> /api/teachers ..."
$response2 = $client.GetAsync($uriTeachers).Result
Write-Host "Status GET:" $response2.StatusCode -ForegroundColor $(if($response2.StatusCode -eq "OK") { "Green" } else { "Red" })

$body2 = $response2.Content.ReadAsStringAsync().Result
Write-Host "`nCorps de la réponse GET /api/teachers:`n"
if ($body2 -eq "{}") {
    Write-Host "❌ Réponse VIDE ({})" -ForegroundColor Red
} else {
    Write-Host $body2
}

# ===== ÉTAPE 3 : GET /api/debug/sessions =====
Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ÉTAPE 3 : GET /api/debug/sessions (diagnostic)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Requête GET -> /api/debug/sessions ..."
try {
    $response3 = $client.GetAsync($uriDebugSessions).Result
    Write-Host "Status GET:" $response3.StatusCode -ForegroundColor $(if($response3.StatusCode -eq "OK") { "Green" } else { "Red" })
    
    $body3 = $response3.Content.ReadAsStringAsync().Result
    Write-Host "`nCorps de la réponse GET /api/debug/sessions:`n"
    Write-Host $body3
    
    # Essayer de parser et afficher en JSON bien formaté
    try {
        $json = $body3 | ConvertFrom-Json
        Write-Host "`n✅ Résumé du debug :" -ForegroundColor Green
        Write-Host "  Sessions actives: $($json.activeSessions)"
        if ($json.sessions.Count -gt 0) {
            $json.sessions | ForEach-Object {
                Write-Host ("  - Sessio ID: {0}" -f $_.sessionId.Substring(0, 16) + "...")
                Write-Host ("    • Professors: {0}" -f $_.teachersCount) -ForegroundColor $(if($_.teachersCount -gt 0) { "Green" } else { "Yellow" })
                Write-Host ("    • Subgroups: {0}" -f $_.subgroupsCount) -ForegroundColor $(if($_.subgroupsCount -gt 0) { "Green" } else { "Yellow" })
                Write-Host ("    • Activities: {0}" -f $_.activitiesCount) -ForegroundColor $(if($_.activitiesCount -gt 0) { "Green" } else { "Yellow" })
            }
        }
    } catch {
        Write-Host "⚠️  Impossible de parser le JSON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de l'appel debug/sessions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Script terminé" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Read-Host "Appuyez sur Entrée pour fermer..."
