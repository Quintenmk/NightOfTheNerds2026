$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "Created .env from .env.example." -ForegroundColor Green
}

$pythonCommand = Get-Command py -ErrorAction SilentlyContinue
if ($pythonCommand) {
    & $pythonCommand.Source -3 -m pip install -r requirements.txt
} else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python 3 was not found."
    }
    & $pythonCommand.Source -m pip install -r requirements.txt
}

Write-Host ""
Write-Host "Python dependencies are installed." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Fill in .env."
Write-Host "2. Install ngrok and run: ngrok config add-authtoken YOUR_NEW_TOKEN"
Write-Host "3. Start the event with: .\start-event.ps1"

