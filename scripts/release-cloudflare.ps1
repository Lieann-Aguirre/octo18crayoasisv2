#Requires -Version 7.2
[CmdletBinding()]
param([switch]$Apply,[switch]$SkipChecks)
$ErrorActionPreference='Stop'
$project=Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $project
try {
 if(-not $Apply){
  Write-Host 'Preview only. No live changes will be made.'
  Write-Host 'With -Apply: run local checks, apply D1 migrations, deploy the API preserving dashboard variables, and verify its public API version.'
  Write-Host 'Pages still builds from its connected Git branch; push the updated code before retrying publication in Admin.'
  Write-Host 'Required Pages Production variables: CATALOG_API_URL=https://octo18crayoasis.online, CATALOG_BUILD_TOKEN matching the Worker, REQUIRE_APPROVED_CATALOG=true, PUBLIC_TURNSTILE_SITE_KEY.'
  Write-Host 'Required Worker secrets: ACCESS_AUD, TURNSTILE_SECRET, MICROSOFT_CLIENT_SECRET, PAGES_DEPLOY_HOOK, CATALOG_BUILD_TOKEN, CF_API_TOKEN (Pages Read). Existing variables/secrets are retained.'
  Write-Host 'Run: pwsh -File scripts/release-cloudflare.ps1 -Apply'
  return
 }
 function Run-Native([string]$Program,[string[]]$Arguments){
  & $Program @Arguments
  if($LASTEXITCODE -ne 0){throw "$Program failed with exit code $LASTEXITCODE. Release stopped; inspect the error before retrying."}
 }
 if(-not $SkipChecks){
  Run-Native 'npm.cmd' @('run','check:api-config')
  Run-Native 'npm.cmd' @('run','check')
  Run-Native 'npm.cmd' @('test')
  Run-Native 'npm.cmd' @('run','build')
 }
 Run-Native 'npx.cmd' @('wrangler','d1','migrations','apply','octo18','--remote')
 Run-Native 'npx.cmd' @('wrangler','deploy','--keep-vars')
 $verified=$false
 for($attempt=0;$attempt -lt 5;$attempt++){
  try{$health=Invoke-RestMethod -Uri 'https://octo18crayoasis.online/api/health' -TimeoutSec 15
   if($health.service -eq 'octo18-api' -and $health.apiVersion -eq 2){$verified=$true;break}
  }catch{Write-Host 'Waiting for the updated API route...'}
  Start-Sleep -Seconds 3
 }
 if(-not $verified){throw 'The new API was deployed but /api/health is not reporting version 2. Check the /api/* Worker route and Access path restrictions. No publication was marked successful.'}
 Write-Host 'API version 2 is verified. Open /admin/ → System checks to review all missing configuration at once.'
 Write-Host 'Push the updated code to the Pages-connected production branch. In Admin → Publish & history, use Publish latest / Retry. Wait for Live before testing a quotation.'
 Write-Host 'Email notification acceptance does not prove inbox delivery. Check Quote inbox for notification status after an actual request.'
}finally{Pop-Location}
