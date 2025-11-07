# Test script to verify session cookie behavior
$backendUrl = "https://timetableedtforfet-production.up.railway.app/api"

Write-Host "`n=== Testing Session Cookie Behavior ===" -ForegroundColor Cyan

# Step 1: Upload files
Write-Host "`n1. Uploading files..." -ForegroundColor Yellow
$uploadResponse = curl.exe -v -X POST "$backendUrl/upload" `
  -F "teachersXml=@backend/data/teachers.xml" `
  -F "subgroupsXml=@backend/data/subgroups.xml" `
  -F "activitiesXml=@backend/data/activities.xml" `
  2>&1

# Extract Set-Cookie header
$setCookieLine = $uploadResponse | Select-String "Set-Cookie: TIMETABLE_SESSION"
Write-Host "Set-Cookie header: $setCookieLine" -ForegroundColor Green

# Extract session ID
if ($setCookieLine -match "TIMETABLE_SESSION=([^;]+)") {
    $sessionId = $matches[1]
    Write-Host "Session ID extracted: $sessionId" -ForegroundColor Green
    
    # Step 2: Try to get teachers with the session cookie
    Write-Host "`n2. Getting teachers with session cookie..." -ForegroundColor Yellow
    $teachersResponse = curl.exe -v -H "Cookie: TIMETABLE_SESSION=$sessionId" "$backendUrl/teachers" 2>&1
    Write-Host $teachersResponse
} else {
    Write-Host "ERROR: No session cookie found in upload response!" -ForegroundColor Red
    Write-Host "Full response:" -ForegroundColor Red
    Write-Host $uploadResponse
}
