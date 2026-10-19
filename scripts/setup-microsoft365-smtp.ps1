#requires -Version 7.2
<#
.SYNOPSIS
Registers (or configures) an Entra application for app-only Microsoft 365 SMTP.
.EXAMPLE
./scripts/setup-microsoft365-smtp.ps1 -TenantId 'YOUR-TENANT-ID' -SenderMailbox 'sender@yourdomain.com' -EnableMailboxSmtpAuth
.EXAMPLE
./scripts/setup-microsoft365-smtp.ps1 -TenantId 'YOUR-TENANT-ID' -SenderMailbox 'sender@yourdomain.com' -ApplicationId 'YOUR-EXISTING-APP-ID'
.NOTES
Run yourself as a tenant administrator. No email is sent. No tenant-wide security
settings are disabled. Secrets are exported using Windows user-bound encryption.
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact='Medium')]
param(
    [Parameter(Mandatory)][guid]$TenantId,
    [Parameter(Mandatory)][string]$SenderMailbox,
    [guid]$ApplicationId = [guid]::Empty,
    [string]$ApplicationName = 'Octo18 Quotation SMTP',
    [ValidateRange(30,365)][int]$SecretDays = 180,
    [string]$NotifyTo = 'felicianorenz029@gmail.com',
    [switch]$EnableMailboxSmtpAuth,
    [string]$OutputDirectory = (Join-Path $env:LOCALAPPDATA 'Octo18\m365-smtp')
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Run this version in PowerShell 7 on Windows so the credential export uses Windows DPAPI encryption.' }
foreach ($address in @($SenderMailbox,$NotifyTo)) {
    $parsedAddress = [System.Net.Mail.MailAddress]::new($address)
    if ($parsedAddress.Address -ne $address -or $address -match '[\r\n]') { throw 'Use plain email addresses, without display names.' }
}
if (-not $PSCmdlet.ShouldProcess("Tenant $TenantId / mailbox $SenderMailbox", 'Configure an app, grant SMTP.SendAsApp and mailbox FullAccess/SendAs, and create an encrypted application credential')) { return }
foreach ($module in @('Microsoft.Graph.Authentication','Microsoft.Graph.Applications','ExchangeOnlineManagement')) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        throw "Install the required module first: Install-Module $module -Scope CurrentUser -Repository PSGallery"
    }
}

$authModules = @(Get-Module -ListAvailable Microsoft.Graph.Authentication)
$appModules = @(Get-Module -ListAvailable Microsoft.Graph.Applications)
$graphVersion = $appModules.Version | Where-Object { $_ -in $authModules.Version } | Sort-Object -Descending | Select-Object -First 1
if (-not $graphVersion) {
    throw 'Install matching versions of Microsoft.Graph.Authentication and Microsoft.Graph.Applications, then rerun in pwsh -NoProfile.'
}
$loadedAuth = @([AppDomain]::CurrentDomain.GetAssemblies() | Where-Object { $_.GetName().Name -eq 'Microsoft.Graph.Authentication' })
if (@($loadedAuth | Where-Object { $_.GetName().Version.ToString(3) -ne $graphVersion.ToString(3) }).Count) {
    throw "A different Microsoft Graph authentication assembly is already loaded. Start a fresh PowerShell process using pwsh -NoProfile and rerun this script. Required matching module version: $graphVersion. Removing a module does not unload its .NET assembly."
}
Write-Host "Using matching Microsoft Graph modules: $graphVersion"
Import-Module Microsoft.Graph.Authentication -RequiredVersion $graphVersion
Import-Module Microsoft.Graph.Applications -RequiredVersion $graphVersion
Import-Module ExchangeOnlineManagement
$graphConnected = $false
$exchangeConnected = $false
$createdPassword = $null
$credentialSaved = $false
try {
    Connect-MgGraph -TenantId $TenantId.ToString() -Scopes 'Application.ReadWrite.All','AppRoleAssignment.ReadWrite.All','Directory.Read.All' -ContextScope Process -NoWelcome
    $graphConnected = $true
    if ((Get-MgContext).TenantId -ne $TenantId.ToString()) { throw 'The connected Graph tenant does not match TenantId.' }
    Connect-ExchangeOnline -Organization $TenantId.ToString() -ShowBanner:$false
    $exchangeConnected = $true
    # Preflight the real Exchange mailbox before creating any application resources.
    $mailbox = Get-EXOMailbox -Identity $SenderMailbox -Properties PrimarySmtpAddress
    $SenderMailbox = $mailbox.PrimarySmtpAddress.ToString()
    $cas = Get-CASMailbox -Identity $SenderMailbox
    $org = Get-TransportConfig
    $smtpDisabled = ($cas.SmtpClientAuthenticationDisabled -eq $true) -or
        (($null -eq $cas.SmtpClientAuthenticationDisabled) -and $org.SmtpClientAuthenticationDisabled)
    if ($smtpDisabled -and -not $EnableMailboxSmtpAuth) {
        throw 'SMTP AUTH is disabled for this mailbox. If your administrator permits it, rerun with -EnableMailboxSmtpAuth. This script does not change tenant-wide security defaults.'
    }
    $exchangeApi = Get-MgServicePrincipal -Filter "appId eq '00000002-0000-0ff1-ce00-000000000000'" -Property Id,AppRoles
    if (-not $exchangeApi) { throw 'Office 365 Exchange Online service principal was not found in this tenant.' }
    $smtpRole = @($exchangeApi.AppRoles | Where-Object { $_.Value -eq 'SMTP.SendAsApp' -and $_.AllowedMemberTypes -contains 'Application' -and $_.IsEnabled })
    if ($smtpRole.Count -ne 1) { throw 'Could not resolve the SMTP.SendAsApp application permission.' }
    if ($ApplicationId -eq [guid]::Empty) {
        $escapedName = $ApplicationName.Replace("'", "''")
        $sameName = @(Get-MgApplication -Filter "displayName eq '$escapedName'" -Property Id,AppId)
        if ($sameName.Count) { throw "An application named '$ApplicationName' exists. Rerun with -ApplicationId using its Application (client) ID to avoid creating a duplicate." }
        $app = New-MgApplication -DisplayName $ApplicationName -SignInAudience AzureADMyOrg
    } else {
        $found = @(Get-MgApplication -Filter "appId eq '$ApplicationId'" -Property Id,AppId,RequiredResourceAccess,DisplayName)
        if ($found.Count -ne 1) { throw 'ApplicationId must identify an existing application registration in this tenant.' }
        $app = $found[0]
    }
    Write-Host "Application (client) ID: $($app.AppId)"
    # Re-read registration: preserve all existing API permissions when adding SMTP.
    $app = Get-MgApplication -ApplicationId $app.Id -Property Id,AppId,RequiredResourceAccess,DisplayName
    $requirements = @($app.RequiredResourceAccess | ForEach-Object {
        @{ ResourceAppId=$_.ResourceAppId; ResourceAccess=@($_.ResourceAccess | ForEach-Object { @{Id=$_.Id;Type=$_.Type} }) }
    })
    $exchangeRequirement = $requirements | Where-Object { $_.ResourceAppId -eq '00000002-0000-0ff1-ce00-000000000000' }
    if ($exchangeRequirement) {
        if (-not @($exchangeRequirement.ResourceAccess | Where-Object { $_.Id -eq $smtpRole[0].Id -and $_.Type -eq 'Role' }).Count) {
            $exchangeRequirement.ResourceAccess += @{Id=$smtpRole[0].Id;Type='Role'}
        }
    } else {
        $requirements += @{ResourceAppId='00000002-0000-0ff1-ce00-000000000000';ResourceAccess=@(@{Id=$smtpRole[0].Id;Type='Role'})}
    }
    Update-MgApplication -ApplicationId $app.Id -RequiredResourceAccess $requirements
    $principals = @(Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" -Property Id,AppId)
    if (-not $principals.Count) { $enterpriseApp = New-MgServicePrincipal -AppId $app.AppId }
    else { $enterpriseApp = $principals[0] }
    # This app-role assignment grants tenant admin consent to SMTP.SendAsApp.
    $assignment = @(Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $enterpriseApp.Id -All | Where-Object {
        $_.ResourceId -eq $exchangeApi.Id -and $_.AppRoleId -eq $smtpRole[0].Id
    })
    if (-not $assignment.Count) {
        $null = New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $enterpriseApp.Id -PrincipalId $enterpriseApp.Id -ResourceId $exchangeApi.Id -AppRoleId $smtpRole[0].Id
    }
    # IMPORTANT: ObjectId is the Enterprise Application service principal ID,
    # not the application registration object ID.
    $exoApp = Get-ServicePrincipal | Where-Object { $_.AppId -eq $app.AppId } | Select-Object -First 1
    if (-not $exoApp) {
        $null = New-ServicePrincipal -AppId $app.AppId -ObjectId $enterpriseApp.Id -DisplayName $ApplicationName
        $exoApp = Get-ServicePrincipal | Where-Object { $_.AppId -eq $app.AppId } | Select-Object -First 1
    }
    if (-not $exoApp) { throw 'Exchange service principal is not visible yet. Wait for propagation and rerun with -ApplicationId.' }
    $fullAccess = @(Get-MailboxPermission -Identity $SenderMailbox -User $exoApp.Identity -ErrorAction SilentlyContinue | Where-Object { $_.AccessRights -contains 'FullAccess' -and -not $_.Deny })
    if (-not $fullAccess.Count) {
        $null = Add-MailboxPermission -Identity $SenderMailbox -User $exoApp.Identity -AccessRights FullAccess -InheritanceType All -AutoMapping:$false -Confirm:$false
    }
    $sendAs = @(Get-RecipientPermission -Identity $SenderMailbox -Trustee $exoApp.Identity -ErrorAction SilentlyContinue | Where-Object { $_.AccessRights -contains 'SendAs' -and $_.AccessControlType -eq 'Allow' })
    if (-not $sendAs.Count) {
        $null = Add-RecipientPermission -Identity $SenderMailbox -Trustee $exoApp.Identity -AccessRights SendAs -Confirm:$false
    }
    if ($smtpDisabled -and $EnableMailboxSmtpAuth) {
        Set-CASMailbox -Identity $SenderMailbox -SmtpClientAuthenticationDisabled $false
    }
    $null = New-Item -ItemType Directory -Path $OutputDirectory -Force
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $credentialPath = Join-Path $OutputDirectory "$($app.AppId)-$stamp.credential.clixml"
    $configPath = Join-Path $OutputDirectory "$($app.AppId)-$stamp.settings.json"
    $expires = [DateTimeOffset]::UtcNow.AddDays($SecretDays)
    $createdPassword = Add-MgApplicationPassword -ApplicationId $app.Id -PasswordCredential @{DisplayName="Octo18 SMTP $stamp";EndDateTime=$expires}
    $secureSecret = ConvertTo-SecureString -String $createdPassword.SecretText -AsPlainText -Force
    $credential = [pscredential]::new($app.AppId,$secureSecret)
    $credential | Export-Clixml -LiteralPath $credentialPath -NoClobber
    $credentialSaved = $true
    $config = [ordered]@{
        MICROSOFT_TENANT_ID=$TenantId.ToString(); MICROSOFT_CLIENT_ID=$app.AppId
        SMTP_HOST='smtp.office365.com'; SMTP_PORT=587; SMTP_TLS='STARTTLS'; SMTP_AUTH='XOAUTH2'
        SMTP_USER=$SenderMailbox; NOTIFY_FROM=$SenderMailbox; NOTIFY_TO=$NotifyTo
        OAuthScope='https://outlook.office365.com/.default'; SecretExpiresUtc=$expires.ToString('o')
        EncryptedCredentialPath=$credentialPath
    }
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
    Write-Host "Mailbox configured: $SenderMailbox"
    Write-Host "Non-secret settings: $configPath"
    Write-Host "Encrypted credential: $credentialPath"
    Write-Host "Client secret expires: $($expires.ToString('u')) — rotate it before this date."
    Write-Host 'Permissions may take time to propagate. This script has not sent a test email or changed Cloudflare.'
    [pscustomobject]$config
} catch {
    if ($createdPassword -and -not $credentialSaved) {
        # Avoid leaving a credential that was generated but could not be saved.
        try { Remove-MgApplicationPassword -ApplicationId $app.Id -KeyId $createdPassword.KeyId } catch { Write-Warning 'Could not revoke the unsaved application credential. Revoke the newly created password credential in Entra.' }
    }
    throw
} finally {
    $createdPassword = $null
    if ($exchangeConnected) { Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue }
    if ($graphConnected) { $null = Disconnect-MgGraph -ErrorAction SilentlyContinue }
}
