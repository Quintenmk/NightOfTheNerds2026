$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

function Get-EnvValue {
    param([string]$Name)

    if (-not (Test-Path -LiteralPath ".env")) {
        return $null
    }

    $line = Get-Content -LiteralPath ".env" |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -Last 1

    if (-not $line) {
        return $null
    }

    return ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
}

if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "A new .env file was created." -ForegroundColor Yellow
    Write-Host "Add the Portkey API key and public ngrok URL, then run this script again."
    Read-Host "Press Enter to close"
    exit 1
}

$apiKey = Get-EnvValue "PORTKEY_API_KEY"
if (-not $apiKey -or $apiKey -like "replace_*") {
    Write-Host "PORTKEY_API_KEY is missing from .env." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$pythonCommand = Get-Command py -ErrorAction SilentlyContinue
$pythonArgs = @("-3", "backend\app.py")
if (-not $pythonCommand) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    $pythonArgs = @("backend\app.py")
}

if (-not $pythonCommand) {
    Write-Host "Python 3 was not found. Install Python and enable 'Add Python to PATH'." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

if ($pythonCommand.Name -eq "py.exe") {
    & $pythonCommand.Source -3 -c "import flask, flask_cors, dotenv, requests" 2>$null
} else {
    & $pythonCommand.Source -c "import flask, flask_cors, dotenv, requests" 2>$null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing required Python packages..." -ForegroundColor Yellow
    if ($pythonCommand.Name -eq "py.exe") {
        & $pythonCommand.Source -3 -m pip install -r requirements.txt
    } else {
        & $pythonCommand.Source -m pip install -r requirements.txt
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Python packages could not be installed." -ForegroundColor Red
        Read-Host "Press Enter to close"
        exit 1
    }
}

$flaskProcess = Start-Process `
    -FilePath $pythonCommand.Source `
    -ArgumentList $pythonArgs `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden `
    -PassThru

$deadline = (Get-Date).AddSeconds(20)
$serverReady = $false
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-WebRequest -UseBasicParsing "http://localhost:5000/" -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            break
        }
    } catch {
        if ($flaskProcess.HasExited) {
            break
        }
    }
}

if (-not $serverReady) {
    Write-Host "Flask did not start. Run 'py backend\app.py' to see the error." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$publicUrl = Get-EnvValue "PUBLIC_QR_BASE_URL"
$ngrokProcess = $null
$ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue

if ($publicUrl -and $ngrokCommand) {
    $domain = ([uri]$publicUrl).Host
    $ngrokProcess = Start-Process `
        -FilePath $ngrokCommand.Source `
        -ArgumentList @("http", "5000", "--url", "https://$domain") `
        -WorkingDirectory $projectDir `
        -WindowStyle Hidden `
        -PassThru
} elseif (-not $ngrokCommand) {
    Write-Host "ngrok was not found. The local app will work, but phone QR links will not." -ForegroundColor Yellow
} else {
    Write-Host "PUBLIC_QR_BASE_URL is missing. The local app will work, but phone QR links will not." -ForegroundColor Yellow
}

$browserCommand = Get-Command msedge -ErrorAction SilentlyContinue
$browserPath = $browserCommand.Source
if (-not $browserPath) {
    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path -LiteralPath $edgePath) {
        $browserPath = $edgePath
    }
}

if ($browserPath) {
    Start-Process -FilePath $browserPath -ArgumentList @(
        "--kiosk",
        "--app=http://localhost:5000/",
        "--edge-kiosk-type=fullscreen",
        "--no-first-run"
    )
} else {
    Start-Process "http://localhost:5000/"
}

Write-Host ""
Write-Host "Movie Poster Premiere is running." -ForegroundColor Green
Write-Host "Local app: http://localhost:5000/"
if ($publicUrl) {
    Write-Host "Public QR URL: $publicUrl"
}
Write-Host ""
Write-Host "Keep this window open. Press Enter to stop Flask and ngrok."
Read-Host

if ($ngrokProcess -and -not $ngrokProcess.HasExited) {
    Stop-Process -Id $ngrokProcess.Id
}
if ($flaskProcess -and -not $flaskProcess.HasExited) {
    Stop-Process -Id $flaskProcess.Id
}
