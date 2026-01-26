# Script para parar backend local e garantir que apenas Kubernetes esteja ativo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Parar Backend Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Encontrar processos Python do backend local
Write-Host "[1/3] Procurando processos Python do backend local..." -ForegroundColor Yellow
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*Saude*backend*venv*" -or 
    $_.Path -like "*Saude*backend*Scripts*"
}

if ($pythonProcs) {
    Write-Host "  [AVISO] Backend Python local encontrado:" -ForegroundColor Yellow
    $pythonProcs | ForEach-Object { 
        Write-Host "    PID: $($_.Id) - $($_.Path)" -ForegroundColor Gray 
    }
    
    Write-Host ""
    Write-Host "[2/3] Parando processos do backend local..." -ForegroundColor Yellow
    $pythonProcs | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            Write-Host "  [OK] Processo $($_.Id) parado" -ForegroundColor Green
        } catch {
            Write-Host "  [ERRO] Nao foi possivel parar processo $($_.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  [OK] Nenhum backend Python local encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] Verificando processos na porta 8000..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$portProcesses = netstat -ano | Select-String ":8000.*LISTENING"
if ($portProcesses) {
    Write-Host "  Processos ainda escutando na porta 8000:" -ForegroundColor Yellow
    $portProcesses | ForEach-Object {
        if ($_ -match "(\d+)$") {
            $processId = $matches[1]
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                if ($proc.ProcessName -eq "kubectl") {
                    Write-Host "    PID $processId : $($proc.ProcessName) (Port-forward Kubernetes) [OK]" -ForegroundColor Green
                } elseif ($proc.ProcessName -eq "python") {
                    Write-Host "    PID $processId : $($proc.ProcessName) (Backend local) [PARAR]" -ForegroundColor Red
                    try {
                        Stop-Process -Id $processId -Force -ErrorAction Stop
                        Write-Host "      Processo $processId parado" -ForegroundColor Green
                    } catch {
                        Write-Host "      Erro ao parar processo $processId" -ForegroundColor Red
                    }
                } else {
                    Write-Host "    PID $processId : $($proc.ProcessName)" -ForegroundColor Gray
                }
            }
        }
    }
} else {
    Write-Host "  [AVISO] Nenhum processo escutando na porta 8000" -ForegroundColor Yellow
    Write-Host "    Execute: .\scripts\deployment\garantir-port-forward.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend Local Parado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agora garanta que o port-forward do Kubernetes esteja ativo:" -ForegroundColor Cyan
Write-Host "  .\scripts\deployment\garantir-port-forward.ps1" -ForegroundColor White
Write-Host ""
