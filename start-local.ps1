# Script para iniciar Energym localmente
# Uso: .\start-local.ps1

Write-Host "🚀 Iniciando Energym localmente..." -ForegroundColor Cyan
Write-Host ""

# Verificar si MongoDB está corriendo (opcional)
Write-Host "📋 Nota: Asegúrate de tener MongoDB corriendo en localhost:27017" -ForegroundColor Yellow
Write-Host "   O configura una conexión a MongoDB Atlas en backend/.env" -ForegroundColor Yellow
Write-Host ""

# Iniciar Backend
Write-Host "🔧 Iniciando Backend en puerto 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Esperar un poco para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend en puerto 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Presiona Ctrl+C en cada ventana para detener los servidores" -ForegroundColor Yellow

