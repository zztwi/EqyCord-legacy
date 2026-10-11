# EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
if ((& git -C $repo status --porcelain).Length -gt 0) { throw 'Commit the matching source before packaging.' }
$build = (& git -C $repo rev-parse --short=8 HEAD).Trim()
$root = Join-Path $repo "work/web-package-$build"
if (Test-Path -LiteralPath $root) { throw 'A package for this commit already exists.' }
New-Item -ItemType Directory -Path $root | Out-Null
$extension = Join-Path $repo 'dist/chromium-unpacked'
if (!(Test-Path -LiteralPath (Join-Path $extension 'manifest.json'))) { throw 'Run pnpm buildWeb first.' }
Copy-Item -LiteralPath $extension -Destination (Join-Path $root 'extension') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'launch.cmd') -Destination (Join-Path $root 'EqyCord-Web.cmd')
foreach ($file in @('LICENSE', 'WEB-CLIENT.md', 'PLUGIN-TESTING.md')) { Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $root }
& git -C $repo archive --format=zip "--output=$(Join-Path $root 'EqyCord-source.zip')" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Source archive failed.' }
$files = @{}
Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
    $files[[IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/')] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
}
@{ commit = $build; files = $files } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $root 'BUILD-INFO.json') -Encoding utf8
$zip = Join-Path $repo "work/EqyCord-Web-$build.zip"
Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $root).FullName -DestinationPath $zip
Write-Output $root
Write-Output $zip
