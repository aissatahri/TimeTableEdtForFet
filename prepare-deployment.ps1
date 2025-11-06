# Script de preparation pour le deploiement Railway
# Ce script vous aide a preparer votre projet avant le deploiement

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Timetable - Script de Deploiement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour verifier si Git est installe
function Test-GitInstalled {
    try {
        $null = git --version
        return $true
    } catch {
        return $false
    }
}

# Fonction pour verifier si un depot Git existe
function Test-GitRepo {
    return Test-Path ".git"
}

# 1. Verifier Git
Write-Host "[1/6] Verification de Git..." -ForegroundColor Yellow
if (-not (Test-GitInstalled)) {
    Write-Host "X Git n'est pas installe. Veuillez installer Git depuis https://git-scm.com/" -ForegroundColor Red
    exit 1
}
Write-Host "OK Git est installe" -ForegroundColor Green
Write-Host ""

# 2. Initialiser le depot Git si necessaire
Write-Host "[2/6] Initialisation du depot Git..." -ForegroundColor Yellow
if (-not (Test-GitRepo)) {
    Write-Host "Initialisation d'un nouveau depot Git..." -ForegroundColor Gray
    git init
    Write-Host "OK Depot Git initialise" -ForegroundColor Green
} else {
    Write-Host "OK Depot Git deja initialise" -ForegroundColor Green
}
Write-Host ""

# 3. Creer .gitignore si necessaire
Write-Host "[3/6] Creation du fichier .gitignore..." -ForegroundColor Yellow
if (-not (Test-Path ".gitignore")) {
    @"
# Backend
backend/target/
backend/.mvn/
backend/data/sessions/
backend/*.log

# Frontend
timetable-frontend-angular17/node_modules/
timetable-frontend-angular17/dist/
timetable-frontend-angular17/.angular/
timetable-frontend-angular17/coverage/

# IDE
.vscode/
.idea/
*.iml

# OS
.DS_Store
Thumbs.db
"@ | Out-File -FilePath .gitignore -Encoding UTF8
    Write-Host "OK Fichier .gitignore cree" -ForegroundColor Green
} else {
    Write-Host "OK Fichier .gitignore existe deja" -ForegroundColor Green
}
Write-Host ""

# 4. Demander l'URL du depot GitHub
Write-Host "[4/6] Configuration du depot GitHub..." -ForegroundColor Yellow
Write-Host "Avez-vous deja cree un depot sur GitHub ? (o/n)" -ForegroundColor Cyan
$hasRepo = Read-Host

if ($hasRepo -eq "o" -or $hasRepo -eq "O") {
    Write-Host "Entrez l'URL de votre depot GitHub (ex: https://github.com/username/timetable-app.git):" -ForegroundColor Cyan
    $repoUrl = Read-Host
    
    # Verifier si un remote existe deja
    $remoteExists = git remote get-url origin 2>$null
    if ($remoteExists) {
        Write-Host "Un remote 'origin' existe deja. Voulez-vous le remplacer ? (o/n)" -ForegroundColor Yellow
        $replace = Read-Host
        if ($replace -eq "o" -or $replace -eq "O") {
            git remote remove origin
            git remote add origin $repoUrl
            Write-Host "OK Remote 'origin' mis a jour" -ForegroundColor Green
        } else {
            Write-Host "INFO Remote 'origin' conserve" -ForegroundColor Blue
        }
    } else {
        git remote add origin $repoUrl
        Write-Host "OK Remote 'origin' ajoute" -ForegroundColor Green
    }
} else {
    Write-Host "INFO Creez d'abord un depot sur https://github.com/new" -ForegroundColor Blue
    Write-Host "   Puis relancez ce script." -ForegroundColor Blue
    exit 0
}
Write-Host ""

# 5. Demander l'URL du backend Railway (pour environment.prod.ts)
Write-Host "[5/6] Configuration de l'URL du backend..." -ForegroundColor Yellow
Write-Host "Avez-vous deja deploye le backend sur Railway ? (o/n)" -ForegroundColor Cyan
$hasBackend = Read-Host

if ($hasBackend -eq "o" -or $hasBackend -eq "O") {
    Write-Host "Entrez l'URL complete du backend Railway (ex: https://timetable-backend-production-abc123.up.railway.app):" -ForegroundColor Cyan
    $backendUrl = Read-Host
    
    $envFile = "timetable-frontend-angular17\src\environments\environment.prod.ts"
    $content = @"
export const environment = {
  production: true,
  apiUrl: '$backendUrl/api'
};
"@
    $content | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "OK Fichier environment.prod.ts mis a jour avec l'URL: $backendUrl/api" -ForegroundColor Green
} else {
    Write-Host "INFO Vous devrez mettre a jour l'URL manuellement apres le deploiement du backend" -ForegroundColor Blue
    Write-Host "   Fichier a modifier: timetable-frontend-angular17\src\environments\environment.prod.ts" -ForegroundColor Blue
}
Write-Host ""

# 6. Commit et push
Write-Host "[6/6] Preparation du commit initial..." -ForegroundColor Yellow
Write-Host "Voulez-vous ajouter tous les fichiers et faire un commit ? (o/n)" -ForegroundColor Cyan
$doCommit = Read-Host

if ($doCommit -eq "o" -or $doCommit -eq "O") {
    git add .
    git commit -m "Initial commit - Timetable multi-user application ready for Railway deployment"
    
    Write-Host "OK Commit cree" -ForegroundColor Green
    Write-Host ""
    Write-Host "Voulez-vous pousser vers GitHub maintenant ? (o/n)" -ForegroundColor Cyan
    $doPush = Read-Host
    
    if ($doPush -eq "o" -or $doPush -eq "O") {
        git branch -M main
        git push -u origin main
        Write-Host "OK Code pousse vers GitHub" -ForegroundColor Green
    } else {
        Write-Host "INFO Pour pousser manuellement plus tard, utilisez:" -ForegroundColor Blue
        Write-Host "   git branch -M main" -ForegroundColor Gray
        Write-Host "   git push -u origin main" -ForegroundColor Gray
    }
} else {
    Write-Host "INFO Pour commiter manuellement plus tard, utilisez:" -ForegroundColor Blue
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m `"Initial commit`"" -ForegroundColor Gray
    Write-Host "   git branch -M main" -ForegroundColor Gray
    Write-Host "   git push -u origin main" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OK Preparation terminee !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Yellow
Write-Host "1. Allez sur https://railway.app" -ForegroundColor White
Write-Host "2. Creez un nouveau projet depuis votre depot GitHub" -ForegroundColor White
Write-Host "3. Suivez le guide DEPLOYMENT.md pour la configuration complete" -ForegroundColor White
Write-Host ""
Write-Host "Documentation : DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
