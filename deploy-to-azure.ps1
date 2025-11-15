# Script completo de deployment a Azure App Service
# Uso: .\deploy-to-azure.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('backend','frontend','both')]
    [string]$Target = 'both'
)

Write-Host "🚀 MyGymApp - Deployment a Azure App Service" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuración
$backendAppName = "gym-app-plan"
$frontendAppName = "gym-frontend-app"
$resourceGroup = "gym-app-rg"

# Verificar Azure CLI
try {
    az --version | Out-Null
    Write-Host "✅ Azure CLI detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI no está instalado." -ForegroundColor Red
    Write-Host "Descárgalo de: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Verificar login
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Yellow
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás autenticado. Iniciando login..." -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al autenticarse" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Autenticado correctamente" -ForegroundColor Green
Write-Host ""

# Función para desplegar backend
function Deploy-Backend {
    Write-Host "📦 DESPLEGANDO BACKEND" -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan
    
    Push-Location backend
    
    # Limpiar instalaciones previas
    Write-Host "🧹 Limpiando node_modules..." -ForegroundColor Yellow
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force node_modules
    }
    
    # Instalar dependencias de producción
    Write-Host "📥 Instalando dependencias..." -ForegroundColor Yellow
    npm ci --production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Crear zip
    Write-Host "📦 Creando paquete..." -ForegroundColor Yellow
    $zipPath = "$env:TEMP\backend-deploy.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    
    # Usar Compress-Archive (excluir archivos innecesarios)
    $filesToZip = @(
        "src",
        "node_modules",
        "package.json",
        "package-lock.json",
        "web.config"
    )
    
    Compress-Archive -Path $filesToZip -DestinationPath $zipPath
    
    # Desplegar
    Write-Host "🚀 Desplegando a Azure..." -ForegroundColor Yellow
    az webapp deployment source config-zip `
        --resource-group $resourceGroup `
        --name $backendAppName `
        --src $zipPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend desplegado exitosamente!" -ForegroundColor Green
        Write-Host "🌐 URL: https://$backendAppName.azurewebsites.net" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error desplegando backend" -ForegroundColor Red
    }
    
    # Limpiar
    Remove-Item $zipPath -ErrorAction SilentlyContinue
    Pop-Location
}

# Función para desplegar frontend
function Deploy-Frontend {
    Write-Host "📦 DESPLEGANDO FRONTEND" -ForegroundColor Cyan
    Write-Host "=======================" -ForegroundColor Cyan
    
    Push-Location frontend
    
    # Limpiar build previo
    Write-Host "🧹 Limpiando builds anteriores..." -ForegroundColor Yellow
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force .next
    }
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force node_modules
    }
    
    # Instalar dependencias
    Write-Host "📥 Instalando dependencias..." -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Build de Next.js
    Write-Host "🔨 Building Next.js..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en build de Next.js" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Preparar carpeta de deploy
    Write-Host "📦 Preparando paquete standalone..." -ForegroundColor Yellow
    $deployPath = "$env:TEMP\frontend-deploy"
    if (Test-Path $deployPath) {
        Remove-Item -Recurse -Force $deployPath
    }
    New-Item -ItemType Directory -Path $deployPath | Out-Null
    
    # Copiar standalone build
    Copy-Item -Recurse -Path ".next\standalone\*" -Destination $deployPath
    
    # Copiar static files
    New-Item -ItemType Directory -Path "$deployPath\.next\static" -Force | Out-Null
    Copy-Item -Recurse -Path ".next\static\*" -Destination "$deployPath\.next\static"
    
    # Copiar public si existe
    if (Test-Path "public") {
        Copy-Item -Recurse -Path "public" -Destination $deployPath
    }
    
    # Copiar web.config
    Copy-Item "web.config" -Destination $deployPath
    
    # Copiar package.json
    Copy-Item "package.json" -Destination $deployPath
    
    # Crear zip
    Write-Host "📦 Creando archivo ZIP..." -ForegroundColor Yellow
    $zipPath = "$env:TEMP\frontend-deploy.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    Compress-Archive -Path "$deployPath\*" -DestinationPath $zipPath
    
    # Desplegar
    Write-Host "🚀 Desplegando a Azure..." -ForegroundColor Yellow
    az webapp deployment source config-zip `
        --resource-group $resourceGroup `
        --name $frontendAppName `
        --src $zipPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend desplegado exitosamente!" -ForegroundColor Green
        Write-Host "🌐 URL: https://$frontendAppName.azurewebsites.net" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error desplegando frontend" -ForegroundColor Red
    }
    
    # Limpiar
    Remove-Item -Recurse -Force $deployPath -ErrorAction SilentlyContinue
    Remove-Item $zipPath -ErrorAction SilentlyContinue
    Pop-Location
}

# Ejecutar deployment según target
switch ($Target) {
    'backend' {
        Deploy-Backend
    }
    'frontend' {
        Deploy-Frontend
    }
    'both' {
        Deploy-Backend
        Write-Host ""
        Deploy-Frontend
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verificar variables de entorno en Azure Portal" -ForegroundColor White
Write-Host "   2. Revisar logs: az webapp log tail --name $backendAppName --resource-group $resourceGroup" -ForegroundColor White
Write-Host "   3. Probar endpoints en el navegador" -ForegroundColor White
Write-Host ""
