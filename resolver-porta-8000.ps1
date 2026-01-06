# Resolver conflito de porta 8000
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resolver Conflito de Porta 8000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar o que está usando a porta 8000
Write-Host "[1/3] Verificando porta 8000..." -ForegroundColor Yellow
$connection = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if ($connection) {
    $pid = $connection.OwningProcess
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "  Processo encontrado:" -ForegroundColor Yellow
        Write-Host "    PID: $pid" -ForegroundColor White
        Write-Host "    Nome: $($process.ProcessName)" -ForegroundColor White
        Write-Host "    Caminho: $($process.Path)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "[2/3] Opções:" -ForegroundColor Yellow
        Write-Host "  1. Encerrar o processo (recomendado se for port-forward antigo)" -ForegroundColor Cyan
        Write-Host "  2. Usar porta diferente (8001)" -ForegroundColor Cyan
        Write-Host ""
        
        $choice = Read-Host "Escolha (1 ou 2)"
        
        if ($choice -eq "1") {
            Write-Host "[3/3] Encerrando processo $pid..." -ForegroundColor Yellow
            try {
                Stop-Process -Id $pid -Force
                Start-Sleep -Seconds 2
                Write-Host "  Processo encerrado com sucesso" -ForegroundColor Green
                Write-Host ""
                Write-Host "Agora você pode executar:" -ForegroundColor Cyan
                Write-Host "  kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor White
            } catch {
                Write-Host "  Erro ao encerrar processo: $_" -ForegroundColor Red
                Write-Host "  Tente encerrar manualmente ou use a opção 2" -ForegroundColor Yellow
            }
        } elseif ($choice -eq "2") {
            Write-Host "[3/3] Usando porta alternativa 8001..." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Execute o port-forward na porta 8001:" -ForegroundColor Cyan
            Write-Host "  kubectl port-forward -n saudenold svc/backend 8001:8000" -ForegroundColor White
            Write-Host ""
            Write-Host "E atualize o app.json para:" -ForegroundColor Yellow
            Write-Host '  "apiUrl": "http://192.168.15.17:8001"' -ForegroundColor White
            Write-Host ""
            Write-Host "E configure o proxy de porta:" -ForegroundColor Yellow
            Write-Host "  netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8001 connectaddress=127.0.0.1 connectport=8001" -ForegroundColor White
        } else {
            Write-Host "  Opção inválida" -ForegroundColor Red
        }
    } else {
        Write-Host "  Processo não encontrado (pode ter sido encerrado)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Porta 8000 está livre!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Você pode executar:" -ForegroundColor Cyan
    Write-Host "  kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor White
}

Write-Host ""



