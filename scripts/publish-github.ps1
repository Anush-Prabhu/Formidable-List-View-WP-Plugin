#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$repo = 'Anush-Prabhu/Formidable-List-View-WP-Plugin'
$version = (Select-String -Path '.\formidable-list-view.php' -Pattern "FLV_VERSION', '([^']+)'" | ForEach-Object { $_.Matches.Groups[1].Value })
if (-not $version) { throw 'Could not read FLV_VERSION from formidable-list-view.php' }

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'GitHub CLI is not logged in. Run this first:' -ForegroundColor Yellow
    Write-Host '  gh auth login' -ForegroundColor White
    Write-Host ''
    Write-Host 'Then run this script again.' -ForegroundColor Yellow
    Write-Host 'Manual fallback: build zip only with .\scripts\build-release-zip.ps1' -ForegroundColor DarkGray
    Write-Host 'and upload at https://github.com/Anush-Prabhu/Formidable-List-View-WP-Plugin/releases/new?tag=v' -NoNewline -ForegroundColor DarkGray
    Write-Host $version -ForegroundColor DarkGray
    exit 1
}

Write-Host "Publishing v$version to $repo ..."

gh repo edit $repo `
    --description 'Hierarchical List View tab for the Formidable Forms builder — search, collapse pages, drag reorder, inline edit. MIT License. Requires Formidable 6.31+.' `
    --add-topic formidable-forms `
    --add-topic wordpress-plugin `
    --add-topic form-builder `
    --add-topic wordpress `
    --add-topic php `
    --add-topic javascript `
    --add-topic mit-license 2>$null

gh api -X PATCH "repos/$repo" -f has_discussions=true | Out-Null

& "$PSScriptRoot\build-release-zip.ps1"

$zip = "formidable-list-view-$version.zip"
if (-not (Test-Path $zip)) { throw "Missing $zip" }

$notes = @"
## Formidable List View v$version

Hierarchical **List View** tab for the [Formidable Forms](https://formidableforms.com/) builder.

**Requires:** Formidable Forms 6.31+, WordPress 6.0+, PHP 7.4+  
**License:** [MIT](https://github.com/$repo/blob/master/LICENSE) — free to use, modify, and distribute.

### Features
- Hierarchical tree: pages, sections, fields
- Search by label, field key, or ID
- Collapse to pages (★ Page 1, Page 2, …)
- Sync collapse with builder canvas
- Drag reorder synced to canvas
- Row menu: Delete, Duplicate, Field Settings
- Inline label and visibility editing

### Install
1. Download **``$zip``** below
2. WordPress → **Plugins → Add New → Upload Plugin**
3. Activate **Formidable List View**
4. Edit a form → **Build** → **List View** tab

### Documentation
- [README](https://github.com/$repo/blob/master/README.md)
- [CHANGELOG](https://github.com/$repo/blob/master/CHANGELOG.md)
"@

$tag = "v$version"
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
gh release view $tag 2>$null | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEAP

if ($releaseExists) {
    gh release upload $tag $zip --clobber
    gh release edit $tag --title $tag --notes $notes
    Write-Host "Updated release $tag"
} else {
    gh release create $tag $zip --title $tag --notes $notes
    Write-Host "Created release $tag"
}

Write-Host "Done: https://github.com/$repo/releases/tag/$tag"
