# Deploy backend simple
$resourceGroup = "gym-app-rg"
$backendAppName = "gym-app-plan"

Write-Host "Desplegando backend..." -ForegroundColor Cyan

Set-Location backend

# Limpiar
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
}

# Instalar
npm ci --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error instalando dependencias" -ForegroundColor Red
    exit 1
}

# Crear zip
$zipPath = "$env:TEMP\backend-deploy.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path "src","node_modules","package.json","package-lock.json","web.config" -DestinationPath $zipPath

# Desplegar
az webapp deployment source config-zip --resource-group $resourceGroup --name $backendAppName --src $zipPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backend desplegado!" -ForegroundColor Green
}

Remove-Item $zipPath -ErrorAction SilentlyContinue
Set-Location ..
