$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $repoRoot
try {
    & node scripts/validate-release.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Release validation failed' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed; package was not built' }
    $releaseManifest = Get-Content -LiteralPath (Join-Path $repoRoot 'manifest.json') -Raw | ConvertFrom-Json
    $outputDirectory = Join-Path $repoRoot 'dist'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $zipPath = Join-Path $outputDirectory "A360-BotKit-$($releaseManifest.version).zip"
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $releaseFiles = @('manifest.json', 'LICENSE')
    foreach ($folder in @('background', 'content_scripts', 'popup', 'icons')) {
        foreach ($file in Get-ChildItem -LiteralPath (Join-Path $repoRoot $folder) -File -Recurse) {
            if ($file.Extension -notin @('.js', '.html', '.css', '.png')) { continue }
            $releaseFiles += $file.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
        }
    }
    $stream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
    $archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($relativePath in ($releaseFiles | Sort-Object)) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $repoRoot $relativePath), $relativePath) | Out-Null
        }
    } finally { $archive.Dispose(); $stream.Dispose() }
    $check = [IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        if ($null -eq $check.GetEntry('manifest.json')) { throw 'ZIP is missing its root manifest' }
        $names = @($check.Entries | ForEach-Object { $_.FullName })
        if ($names.Count -ne $releaseFiles.Count) { throw 'ZIP entry count is incorrect' }
        if ($names | Where-Object { $_ -match '^(tests|docs|scripts|graphify-out|\.git)/' }) { throw 'Non-runtime files found in ZIP' }
        Write-Output "Verified $($names.Count) ZIP entries with manifest.json at the root."
    } finally { $check.Dispose() }
    $hashStream = [IO.File]::OpenRead($zipPath)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($hasher.ComputeHash($hashStream)).Replace('-', '').ToLowerInvariant() }
    finally { $hasher.Dispose(); $hashStream.Dispose() }
    [IO.File]::WriteAllText("$zipPath.sha256", "$hash  $([IO.Path]::GetFileName($zipPath))`n")
    Write-Output "SHA256: $hash"
    Write-Output "Upload package: $zipPath"
} finally { Pop-Location }
