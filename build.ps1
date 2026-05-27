# build.ps1 - Buduje bundle.user.js z modulow
# Uzycie: .\build.ps1

$ErrorActionPreference = 'Stop'
$enc = [System.Text.Encoding]::UTF8

$MODULES = @(
    'modules\config.js'
    'modules\storage.js'
    'modules\adapter.js'
    'modules\bot.js'
    'modules\ui.js'
    'modules\inventory.js'
    'modules\combat.js'
    'modules\heal.js'
    'modules\farm.js'
    'modules\route.js'
    'modules\captcha.js'
)

# 1. Czytaj main.js
$mainJs = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'main.js'), $enc)

# 2. Wyodrebnij naglowek UserScript
$headerMatch = [regex]::Match($mainJs, '(?s)(// ==UserScript==.*?// ==/UserScript==)')
if (-not $headerMatch.Success) { throw 'Brak naglowka UserScript w main.js' }
$header = $headerMatch.Groups[1].Value
$header = $header -replace '(?m)^.*@require.*\r?\n', ''

# 3. Wyodrebnij cialo IIFE (po use strict; do ostatniego })();)
$strictIdx = $mainJs.IndexOf("'use strict';")
$bodyStart = $mainJs.IndexOf("`n", $strictIdx) + 1
$bodyEnd   = $mainJs.LastIndexOf("`n})();")
if ($bodyStart -le 0 -or $bodyEnd -le 0) { throw 'Nie mozna wyodrebnic ciala IIFE z main.js' }
$initBody  = $mainJs.Substring($bodyStart, $bodyEnd - $bodyStart).Trim()

# 4. Buduj bundle
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add($header)
$lines.Add('')
$lines.Add('(function () {')
$lines.Add("'use strict';")
$lines.Add('')
$lines.Add("if (document.getElementById('mbot-root')) return;")
$lines.Add('')
$lines.Add('window.MBot = window.MBot || {};')
$lines.Add('')

foreach ($mod in $MODULES) {
    $path = Join-Path $PSScriptRoot $mod
    if (-not (Test-Path $path)) {
        Write-Warning "Pominieto (brak pliku): $mod"
        continue
    }
    $content = [System.IO.File]::ReadAllText($path, $enc).Trim()
    $modName = $mod -replace 'modules\\', ''
    $lines.Add("// === $modName ===")
    $lines.Add($content)
    $lines.Add('')
}

$lines.Add('// === init ===')
$lines.Add($initBody)
$lines.Add('')
$lines.Add('})();')

# 5. Zapisz
$bundle  = $lines -join "`n"
$outPath = Join-Path $PSScriptRoot 'bundle.user.js'
[System.IO.File]::WriteAllText($outPath, $bundle, $enc)

$lineCount = ($bundle -split "`n").Count
Write-Host "bundle.user.js zbudowany ($lineCount linii)" -ForegroundColor Green
