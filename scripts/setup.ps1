$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
Write-Host 'Pocketify setup (project-local only)'
New-Item -ItemType Directory -Force '.\evidence' | Out-Null
New-Item -ItemType Directory -Force '.\.qvac\models' | Out-Null
if (-not (Test-Path '.\qvac.config.json')) {
  $config = Get-Content '.\qvac.config.template.json' -Raw | ConvertFrom-Json
  $config.cacheDirectory = (Resolve-Path '.\.qvac\models').Path
  $json = $config | ConvertTo-Json -Depth 10
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path 'qvac.config.json'), $json, $encoding)
  Write-Host 'Created machine-local qvac.config.json.'
}
node --version
npm.cmd --version
if (-not (Test-Path '.\node_modules\@qvac\sdk\package.json')) {
  npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check network and package registry access.' }
} else {
  Write-Host 'QVAC packages already present; skipping installation.'
}
.\node_modules\.bin\qvac.cmd doctor --json | Out-File -Encoding utf8 '.\evidence\doctor-setup.json'
if ($LASTEXITCODE -ne 0) { throw 'qvac doctor failed. See evidence/doctor-setup.json.' }
Write-Host 'Run node qvac-gate.mjs once online to cache the model, then run scripts/demo-offline.ps1.'
