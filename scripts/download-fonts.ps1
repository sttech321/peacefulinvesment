Param(
    [string]$Family = "Bebas+Neue",
    [string]$OutDir = "public/fonts"
)

$cssUrl = "https://fonts.googleapis.com/css2?family=$Family&display=swap"
Write-Host "Fetching Google Fonts CSS: $cssUrl"

try {
    $css = (Invoke-WebRequest -Uri $cssUrl -UseBasicParsing).Content
} catch {
    Write-Error "Failed to fetch CSS from $cssUrl. Check your internet connection."
    exit 1
}

# extract first remote font URL (woff2)
$match = [regex]::Match($css, "url\((https://[^)]+)\)")
if (-not $match.Success) {
    Write-Error "No font URL found in CSS."
    exit 1
}

$remote = $match.Groups[1].Value
Write-Host "Found font URL: $remote"

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$dest = Join-Path $OutDir "BebasNeue-Regular.woff2"
Write-Host "Downloading to: $dest"

try {
    Invoke-WebRequest -Uri $remote -OutFile $dest -UseBasicParsing
    Write-Host "Downloaded successfully."
} catch {
    Write-Error "Failed to download font: $_"
    exit 1
}

Write-Host "Done. You can now reference /fonts/BebasNeue-Regular.woff2 in your CSS."