# Microsoft 365 application setup for quotation notifications

Run `scripts/setup-microsoft365-smtp.ps1` yourself in PowerShell 7 on Windows, signed in with a tenant administrator permitted to manage applications, grant application consent and manage Exchange mailbox permissions. It creates a dedicated single-tenant application, or configures an application you already registered when `-ApplicationId` is supplied. Use the actual Microsoft 365 mailbox you own; the website's Gmail inquiry recipient is not a Microsoft 365 sender.

## Install the Microsoft modules

```powershell
Install-Module Microsoft.Graph.Authentication -Scope CurrentUser -Repository PSGallery
Install-Module Microsoft.Graph.Applications -Scope CurrentUser -Repository PSGallery
Install-Module ExchangeOnlineManagement -Scope CurrentUser -Repository PSGallery
```

## Preview the changes without signing in or changing the tenant

Replace the sample tenant GUID and mailbox:

```powershell
.\scripts\setup-microsoft365-smtp.ps1 `
  -TenantId '00000000-0000-0000-0000-000000000000' `
  -SenderMailbox 'sender@your-business-domain.com' `
  -EnableMailboxSmtpAuth -WhatIf
```

## Create and configure the application

```powershell
.\scripts\setup-microsoft365-smtp.ps1 `
  -TenantId 'YOUR-TENANT-GUID' `
  -SenderMailbox 'YOUR-MICROSOFT365-MAILBOX' `
  -EnableMailboxSmtpAuth
```

If you already created the application in Entra, add:

```powershell
  -ApplicationId 'YOUR-APPLICATION-CLIENT-ID'
```

Use the Directory (tenant) ID and Application (client) ID from Entra. The script independently resolves the Enterprise Application object ID required by Exchange. If interrupted, rerun with `-ApplicationId` to reuse the created application. Existing permissions are preserved; duplicate grants are skipped. Each successful run creates a new, individually dated client secret rather than deleting old credentials.

## What the script changes

- Declares and grants admin consent for **Office 365 Exchange Online → Application permission → SMTP.SendAsApp**. It does not add Microsoft Graph Mail.Send or delegated user permissions.
- Registers the application's service principal with Exchange.
- Grants **FullAccess and SendAs to the one specified mailbox**, following Microsoft's app-only SMTP setup. These Exchange grants are real mailbox permissions; choose a dedicated sender mailbox and application.
- If `-EnableMailboxSmtpAuth` is explicitly supplied and SMTP AUTH is disabled, enables it for that mailbox only. Tenant-wide SMTP settings and Security Defaults are not changed. Tenant security policies may still prevent SMTP AUTH; ask your administrator to resolve that policy rather than disabling security controls in this script.
- Creates a 180-day application secret by default (`-SecretDays` can change this). The secret is saved as a Windows DPAPI-encrypted PSCredential under `%LOCALAPPDATA%\Octo18\m365-smtp`, readable by the same Windows user on the same computer. It is not printed or written to plaintext configuration.
- Writes a separate non-secret JSON settings file with the SMTP sender, tenant/client IDs, recipient and credential expiry. Store this securely and rotate the client secret before expiration.

No test email is sent, no Cloudflare setting is changed, and no public deployment is performed. Some permissions take time to propagate. The administrator sign-in scopes are used only by this setup session; the created application receives SMTP.SendAsApp, not those directory-management scopes.

## Settings for the SMTP notification sender

If PowerShell reports “Assembly with same name is already loaded”, start a fresh `pwsh -NoProfile` process and rerun the script there without manually importing Graph first. The script selects the newest version installed for both Authentication and Applications. For example, if Authentication has 2.34.0 and 2.26.1 but Applications only has 2.26.1, it selects 2.26.1 for both. `Remove-Module` cannot unload the already loaded .NET assembly. No uninstall is needed when a matching pair is available.

```text
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_TLS=STARTTLS
SMTP_AUTH=XOAUTH2
SMTP_USER=<your Microsoft 365 mailbox>
NOTIFY_FROM=<the same Microsoft 365 mailbox>
NOTIFY_TO=felicianorenz029@gmail.com
MICROSOFT_TENANT_ID=<tenant ID>
MICROSOFT_CLIENT_ID=<application client ID>
MICROSOFT_CLIENT_SECRET=<secret stored in Cloudflare Worker secrets>
```

The app-only token request uses `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, grant type `client_credentials` and scope `https://outlook.office365.com/.default`. SMTP authentication uses SASL XOAUTH2 after STARTTLS. Do not use a mailbox password as the application secret.

To load the generated credential for your own local configuration work:

```powershell
$smtpCredential = Import-Clixml -LiteralPath 'THE-ENCRYPTED-CREDENTIAL-PATH-SHOWN-BY-THE-SCRIPT'
# Client ID is $smtpCredential.UserName.
# Retrieve the secret only when putting it into your secret store:
# $smtpCredential.GetNetworkCredential().Password
```

Keep the client secret out of chat, Git and browser-side environment variables. You can share the sender mailbox, tenant ID and client ID for integration; those are identifiers, not the secret.

**Integration:** `worker/microsoft-smtp.ts` sends through the fixed `smtp.office365.com:587` endpoint, requires STARTTLS and authenticates with app-only XOAUTH2. SMTP_HOST/PORT/TLS/AUTH are documented constants, not editable runtime settings. `worker/index.ts` builds notifications with the customer's email as Reply-To. The sender and non-secret Entra identifiers are in `wrangler.jsonc`.

Before deploying, add `MICROSOFT_CLIENT_SECRET` as a **Secret** on the API Worker. Do not add it to Pages/browser variables. To transfer the encrypted credential without printing it, run this yourself from the project folder while signed into Wrangler:

```powershell
$smtpCredential = Import-Clixml -LiteralPath 'C:\Users\Microsoft\AppData\Local\Octo18\m365-smtp\8e502901-6f2f-4af6-b0f9-641ab2d45eba-20261020-004618-854.credential.clixml'
$smtpCredential.GetNetworkCredential().Password | npx wrangler secret put MICROSOFT_CLIENT_SECRET --name octo18crayoasisv2
Remove-Variable smtpCredential
```

That command changes the live Worker secret and may deploy a Worker version. Run it only when ready to make that change. This local implementation does not deploy or send a real test email. Rotate the supplied credential before its expiry of 2027-04-17 16:46 UTC (18 April in Manila).

Requests are saved before notification. Failed sends retain the request and use existing scheduled/manual retries, up to ten attempts. SMTP acceptance marks a notification sent; it does not prove inbox delivery. Stable Message-ID values help identify retries, but SMTP cannot guarantee exactly-once delivery: a lost final acknowledgement may produce a duplicate. Older requests retain their original estimate behavior. Turnstile and a live approved catalog remain required for public submissions.


## Microsoft references

- [App-only SMTP OAuth, service principal registration and mailbox grants](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth)
- [Mailbox SMTP AUTH configuration](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission)
- [SendAs permission](https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/add-recipientpermission?view=exchange-ps)

## Delivery failure diagnosis

After the authorized live test, quotation O18-20261020-3FBFEFACC50B was saved with PHP 255.64 while its notification failed. Catalog publication and quote persistence are working; that failure is specific to notification delivery.

The Worker now records a safe `notificationFailure` inside the private inquiry JSON (no schema migration). Quote inbox displays its SMTP stage and numeric error code; successful retries clear the previous failure. No access tokens, client secrets or raw Microsoft/SMTP error descriptions are stored.

- `oauth` / Microsoft 7000215: check that MICROSOFT_CLIENT_SECRET contains the application secret VALUE, not its ID, file path or encrypted XML.
- `oauth` / Microsoft 7000222: rotate an expired application secret.
- `authentication` / SMTP 535: verify SMTP.SendAsApp admin consent, the Exchange service principal's Enterprise App object ID and mailbox grants, and mailbox SMTP AUTH policy.
- `sender` rejection: verify the dedicated mailbox and SendAs grant match SMTP_USER and NOTIFY_FROM.
- `connect` or `tls`: check network/runtime TLS errors without weakening STARTTLS.

Deploy the Worker update and rebuild the dashboard to display this diagnostic. Retry the existing TEST ONLY inquiry rather than generating additional requests. Do not claim inbox delivery until the notification is accepted and the recipient confirms receipt.
