$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'
$dataDir = Join-Path $root '.local-postgres'
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$initdb = Join-Path $pgBin 'initdb.exe'
$psql = Join-Path $pgBin 'psql.exe'

function Test-PortListening([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

Write-Host '== Vendor Platform Local Start ==' -ForegroundColor Cyan

if (!(Test-Path $pgCtl) -or !(Test-Path $initdb) -or !(Test-Path $psql)) {
  throw 'PostgreSQL 17 binaries not found at C:\Program Files\PostgreSQL\17\bin'
}

if (-not (Test-PortListening 5433)) {
  if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    & $initdb -D $dataDir -U postgres -A trust | Out-Host
  }

  & $pgCtl -D $dataDir -l (Join-Path $dataDir 'postgres.log') -o '-p 5433' start | Out-Host
}

$dbExists = (& $psql -h localhost -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='vendordb';").Trim()
if ($dbExists -ne '1') {
  & $psql -h localhost -p 5433 -U postgres -d postgres -c 'CREATE DATABASE vendordb;' | Out-Host
}

if (-not (Test-PortListening 5000)) {
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$serverDir'; npm run dev"
  ) | Out-Null
}

if (Test-PortListening 5173) {
  $vitePid = (Get-NetTCPConnection -LocalPort 5173 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess)
  Stop-Process -Id $vitePid -Force
}

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$clientDir'; npx vite --host 0.0.0.0 --port 5173 --strictPort"
) | Out-Null

Write-Host 'Server: http://localhost:5000' -ForegroundColor Green
Write-Host 'Client: http://localhost:5173/login' -ForegroundColor Green
Write-Host 'Admin: admin@demo.com / Admin123' -ForegroundColor Yellow
