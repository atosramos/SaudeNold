# Script auxiliar para encontrar e usar ADB
# Uso: .\scripts\utils\adb-helper.ps1

# Encontrar Android SDK e ADB
$androidSdk = $null
$adbPath = $null

# Verificar locais comuns do Android SDK
$sdkLocations = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT"
)

foreach ($sdk in $sdkLocations) {
    if ($sdk -and (Test-Path $sdk)) {
        $platformTools = Join-Path $sdk "platform-tools\adb.exe"
        if (Test-Path $platformTools) {
            $androidSdk = $sdk
            $adbPath = $platformTools
            break
        }
    }
}

# Se não encontrou, tentar usar adb do PATH
if (-not $adbPath) {
    $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCheck) {
        $adbPath = $adbCheck.Source
    }
}

# Retornar o caminho do ADB
if ($adbPath) {
    return $adbPath
} else {
    Write-Error "ADB nao encontrado. Instale o Android SDK Platform Tools."
    exit 1
}
