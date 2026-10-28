param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$env:QVAC_CONFIG_PATH = (Resolve-Path '.\qvac.config.json').Path
New-Item -ItemType Directory -Force '.\evidence' | Out-Null
Write-Host 'Disconnect internet manually before continuing. This script does not alter network settings.'
$probe = Test-NetConnection 1.1.1.1 -Port 443 -InformationLevel Detailed
$probe | Out-File -Encoding utf8 '.\evidence\demo-offline-connectivity.txt'
if ($probe.TcpTestSucceeded -or $probe.PingSucceeded) { throw 'Outbound network is reachable by TCP or ping. Disconnect internet manually and rerun.' }
try { Get-NetAdapter | Format-Table Name,Status,LinkSpeed | Out-File -Encoding utf8 '.\evidence\demo-offline-adapters.txt' }
catch { "Adapter inspection unavailable: $($_.Exception.Message)" | Out-File -Encoding utf8 '.\evidence\demo-offline-adapters.txt' }
node .\pocketify.mjs scan .\examples\ticket-triage
if ($LASTEXITCODE -ne 0) { throw 'Scan failed.' }
node .\pocketify.mjs migrate .\examples\ticket-triage
if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }
node .\pocketify.mjs triage 'The CSV export crashes when I click Download.'
if ($LASTEXITCODE -ne 0) { throw 'Ticket triage failed.' }
cmd /c 'node pocketify.mjs eval --offline > evidence\demo-offline-eval.txt 2>&1'
if ($LASTEXITCODE -ne 0) { throw 'Evaluation failed. See evidence/demo-offline-eval.txt.' }
Write-Host 'Report: reports/latest.html'
if (-not $NoOpen) { Start-Process -FilePath (Resolve-Path '.\reports\latest.html').Path }
