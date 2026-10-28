param([int]$Port = 4317)
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
if (-not (Test-Path '.\node_modules\@qvac\sdk\package.json') -or -not (Test-Path '.\qvac.config.json')) {
  & (Join-Path $PSScriptRoot 'setup.ps1')
}
$env:QVAC_CONFIG_PATH = (Resolve-Path '.\qvac.config.json').Path
node '.\scripts\build-showcase.mjs'
if ($LASTEXITCODE -ne 0) { throw 'Showcase data build failed.' }
Write-Host "Pocketify Studio Local: http://127.0.0.1:$Port"
Write-Host 'Keep this window open. Press Ctrl+C to shut down safely.'
node '.\studio\server.mjs' --port $Port
