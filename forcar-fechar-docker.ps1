# Script para forcar fechamento do Docker Desktop

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Forcar Fechamento do Docker Desktop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar processos do Docker
Write-Host "Processos do Docker encontrados:" -ForegroundColor Yellow
$dockerProcs = Get-Process | Where-Object { 
    $_.ProcessName -like "*docker*" -or 
    $_.ProcessName -like "*com.docker*" -or
    $_.ProcessName -eq "Docker Desktop"
}

if ($dockerProcs) {
    $dockerProcs | ForEach-Object {
        Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    }
    Write-Host ""
    
    $confirm = Read-Host "Deseja forcar parada de todos esses processos? (S/N)"
    if ($confirm -eq "S" -or $confirm -eq "s") {
        Write-Host ""
        Write-Host "Parando processos..." -ForegroundColor Yellow
        
        foreach ($proc in $dockerProcs) {
            try {
                Write-Host "  Parando: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "  [AVISO] Nao foi possivel parar $($proc.ProcessName)" -ForegroundColor Yellow
            }
        }
        
        Start-Sleep -Seconds 2
        
        # Verificar se ainda ha processos
        $remaining = Get-Process | Where-Object { 
            $_.ProcessName -like "*docker*" -or 
            $_.ProcessName -like "*com.docker*" -or
            $_.ProcessName -eq "Docker Desktop"
        } -ErrorAction SilentlyContinue
        
        if ($remaining) {
            Write-Host ""
            Write-Host "[AVISO] Alguns processos ainda estao rodando:" -ForegroundColor Yellow
            $remaining | ForEach-Object {
                Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            }
            Write-Host ""
            Write-Host "Tente executar como Administrador ou reinicie o computador" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "[OK] Todos os processos foram parados!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Aguarde 30 segundos e abra o Docker Desktop novamente" -ForegroundColor Cyan
        }
    } else {
        Write-Host "Cancelado." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Nenhum processo do Docker encontrado" -ForegroundColor Green
    Write-Host ""
    Write-Host "O Docker Desktop ja esta fechado." -ForegroundColor Cyan
}

Write-Host ""





