# Build release zip from plugin root (excludes .git and dev folders)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Select-String -Path "$root\formidable-list-view.php" -Pattern "FLV_VERSION', '([^']+)'" | ForEach-Object { $_.Matches.Groups[1].Value })
if (-not $version) { throw 'Could not read FLV_VERSION' }
$staging = Join-Path $env:TEMP "formidable-list-view-$version"
$zip = Join-Path $root "formidable-list-view-$version.zip"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
$exclude = @('.git', '.cursor', '.github', 'scripts')
Get-ChildItem $root -Force | Where-Object { $exclude -notcontains $_.Name -and $_.Name -notlike 'formidable-list-view-*.zip' } | ForEach-Object {
    Copy-Item $_.FullName -Destination $staging -Recurse -Force
}
Compress-Archive -Path $staging -DestinationPath $zip -Force
Remove-Item $staging -Recurse -Force
Write-Output "Created $zip"
