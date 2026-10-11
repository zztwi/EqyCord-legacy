# EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
if ((& git -C $repo status --porcelain).Length -gt 0) { throw 'Commit the exact setup source before packaging it.' }
$build = (& git -C $repo rev-parse --short=8 HEAD).Trim()
$work = Join-Path $repo "work/windows-setup-$build"
$payload = Join-Path $work 'payload'
if (Test-Path -LiteralPath $work) { throw 'Build output already exists. Use a fresh commit or a fresh build output directory.' }
New-Item -ItemType Directory -Path $payload -Force | Out-Null
# Both SDK and a private fixed runtime are embedded, without a system install.
$webViewVersion = '1.0.2903.40'
$webViewHash = 'ef128016dd1e51c59178c827ed5b8aa3322c57afa8675d930f8109505542ad74'
$webViewZip = Join-Path $work 'webview2-sdk.zip'
Invoke-WebRequest -Uri "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$webViewVersion/microsoft.web.webview2.$webViewVersion.nupkg" -OutFile $webViewZip
if ((Get-FileHash -LiteralPath $webViewZip -Algorithm SHA256).Hash.ToLower() -ne $webViewHash) { throw 'WebView2 SDK checksum mismatch.' }
$webView = Join-Path $work 'webview2-sdk'
Expand-Archive -LiteralPath $webViewZip -DestinationPath $webView
$fixedVersion = '154.0.4258.62'
$fixedHash = 'e8f55a4bde27c7f82512402b56a58539b5ec8928be4e500e077b6f66c9ef4668'
$fixedUrl = 'https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/b92cd7d9-6976-4f34-9708-47e80937c287/Microsoft.WebView2.FixedVersionRuntime.154.0.4258.62.x64.cab'
$fixedCab = Join-Path $repo 'work/webview2-fixed-x64.cab'
if (!(Test-Path -LiteralPath $fixedCab)) { Invoke-WebRequest -Uri $fixedUrl -OutFile $fixedCab }
if ((Get-FileHash -LiteralPath $fixedCab -Algorithm SHA256).Hash.ToLower() -ne $fixedHash) { throw 'WebView2 fixed runtime checksum mismatch.' }
$fixedWork = Join-Path $work 'fixed-runtime'
New-Item -ItemType Directory -Path $fixedWork -Force | Out-Null
& "$env:WINDIR/System32/expand.exe" '-F:*' $fixedCab $fixedWork | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'WebView2 fixed runtime extraction failed.' }
$fixedRoot = Join-Path $fixedWork "Microsoft.WebView2.FixedVersionRuntime.$fixedVersion.x64"
$fixedManifest = @{}
Get-ChildItem -LiteralPath $fixedRoot -Recurse -File | ForEach-Object {
    $name = [IO.Path]::GetRelativePath($fixedRoot, $_.FullName).Replace('\', '/')
    $fixedManifest[$name] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
}
@{ Build = $fixedVersion; Files = $fixedManifest } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $fixedRoot 'manifest.json') -Encoding utf8
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fixedArchive = Join-Path $work 'web-runtime.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($fixedRoot, $fixedArchive, [IO.Compression.CompressionLevel]::Optimal, $false)
foreach ($folder in @('dist/Installer', 'runtime', 'licenses', 'source', 'scripts/eqycord')) {
    New-Item -ItemType Directory -Path (Join-Path $payload $folder) -Force | Out-Null
}

# Pin the official Node Windows x64 archive. It is used only by the setup,
# never installed globally and never added to PATH.
$runtimeZip = Join-Path $work 'node-v22.14.0-win-x64.zip'
Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip' -OutFile $runtimeZip
$runtimeHash = '55b639295920b219bb2acbcfa00f90393a2789095b7323f79475c9f34795f217'
if ((Get-FileHash -LiteralPath $runtimeZip -Algorithm SHA256).Hash.ToLower() -ne $runtimeHash) { throw 'Node runtime checksum mismatch.' }
Expand-Archive -LiteralPath $runtimeZip -DestinationPath (Join-Path $work 'node')
$runtimeRoot = Join-Path $work 'node/node-v22.14.0-win-x64'
Copy-Item -LiteralPath (Join-Path $runtimeRoot 'node.exe') -Destination (Join-Path $payload 'runtime/node.exe')
Copy-Item -LiteralPath (Join-Path $runtimeRoot 'LICENSE') -Destination (Join-Path $payload 'licenses/NODE-LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $webView 'LICENSE.txt') -Destination (Join-Path $payload 'licenses/WEBVIEW2-LICENSE.txt')

& node --input-type=module -e 'import {ensureInstaller} from "./scripts/eqycord/installer.mjs"; await ensureInstaller();'
if ($LASTEXITCODE -ne 0) { throw 'Pinned upstream installer verification failed.' }
Copy-Item -LiteralPath (Join-Path $repo 'dist/Installer/VencordInstallerCli.exe') -Destination (Join-Path $payload 'dist/Installer/VencordInstallerCli.exe')
Get-ChildItem -LiteralPath (Join-Path $repo 'dist') -File | Where-Object { $_.Name -match '\.(js|css)$|\.LEGAL\.txt$' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $payload 'dist')
}
Copy-Item -LiteralPath (Join-Path $repo 'scripts/eqycord/installer.mjs') -Destination (Join-Path $payload 'scripts/eqycord/installer.mjs')
foreach ($file in @('LICENSE', 'EQYCORD.md', 'BADGES.md', 'PLUGIN-AUDIT.md', 'WINDOWS-INSTALLER.md', 'ENDCORD-PLUGIN-NOTICES.md', 'PLUGIN-TESTING.md')) {
    Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $payload
}
& git -C $repo archive --format=zip "--output=$(Join-Path $payload "source/EqyCord-$build.zip")" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not archive matching source.' }
Invoke-WebRequest -Uri 'https://codeload.github.com/Vencord/Installer/zip/refs/tags/v1.4.2' -OutFile (Join-Path $payload 'source/Vencord-Installer-v1.4.2.zip')
Copy-Item -LiteralPath (Join-Path $repo 'LICENSE') -Destination (Join-Path $payload 'licenses/VENCORD-INSTALLER-GPL.txt')
@{
    EqyCordCommit = (& git -C $repo rev-parse HEAD).Trim()
    NodeVersion = '22.14.0'
    NodeArchiveSHA256 = $runtimeHash
    InstallerVersion = 'v1.4.2'
    InstallerBinarySHA256 = '15268aba25625797bf562187dd87ddadf42882e079c7b6192880ad3e83353ef5'
    Platform = 'Windows x64'
    Signing = 'Unsigned; no signing certificate configured'
    WebView2SDKVersion = $webViewVersion
    WebView2SDKArchiveSHA256 = $webViewHash
    WebView2FixedRuntimeVersion = $fixedVersion
    WebView2FixedRuntimeArchiveSHA256 = $fixedHash
    WebView2FixedRuntimeSource = $fixedUrl
    Surface = 'Local WebGL Mesh Drift; private fixed WebView2 Runtime with native fallback'
    StarterPresetSHA256 = (Get-FileHash -LiteralPath (Join-Path $repo 'src/shared/eqyStarterPreset.json') -Algorithm SHA256).Hash.ToLower()
    StarterPresetPolicy = 'First desktop launch only when settings.json is absent; existing preferences and QuickCSS preserved'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $payload 'BUILD-INFO.json') -Encoding utf8

$files = @{}
Get-ChildItem -LiteralPath $payload -File -Recurse | ForEach-Object {
    $name = [IO.Path]::GetRelativePath($payload, $_.FullName).Replace('\', '/')
    $files[$name] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
}
@{ Build = $build; Files = $files } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $payload 'manifest.json') -Encoding utf8
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = Join-Path $work 'payload.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($payload, $archive)
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$output = Join-Path $work 'EqyCord-Setup.exe'
$icon = Join-Path $work 'EqyCord.ico'
& (Join-Path $PSScriptRoot 'icon.ps1') -Output $icon
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$output" "/win32icon:$icon" "/resource:$archive,EqyCord.Payload" "/resource:$fixedArchive,EqyCord.WebRuntime" "/resource:$(Join-Path $PSScriptRoot 'surface.html'),EqyCord.Surface" "/resource:$(Join-Path $webView 'lib/net462/Microsoft.Web.WebView2.Core.dll'),EqyCord.Microsoft.Web.WebView2.Core" "/resource:$(Join-Path $webView 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'),EqyCord.Microsoft.Web.WebView2.WinForms" "/resource:$(Join-Path $webView 'build/native/x64/WebView2Loader.dll'),EqyCord.WebView2Loader" "/r:$(Join-Path $webView 'lib/net462/Microsoft.Web.WebView2.Core.dll')" "/r:$(Join-Path $webView 'lib/net462/Microsoft.Web.WebView2.WinForms.dll')" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /r:System.Web.Extensions.dll (Join-Path $PSScriptRoot 'Setup.cs') (Join-Path $PSScriptRoot 'WebSurface.cs') (Join-Path $PSScriptRoot 'DiscordLifecycle.cs')
if ($LASTEXITCODE -ne 0) { throw 'Windows setup compilation failed.' }
Write-Output $output
