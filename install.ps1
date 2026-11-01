$ErrorActionPreference = "Stop"
$targetScheme = if ($args.Count -gt 0) { $args[0] } else { $null }

# Validate Node.js version and attempt to switch if necessary
$nodeIsGood = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = (node -v) -replace '^v',''
    $major = [int]($nodeVersion -split '\.')[0]
    if ($major -ge 20) {
        $nodeIsGood = $true
    }
}

if (!$nodeIsGood) {
    Write-Host "Node.js version 20 or higher is required (Node.js 22.x is recommended)."
    Write-Host "Attempting to switch to Node.js 22 using a version manager..."
    
    $switched = $false

    # Try fnm
    if (!$switched -and (Get-Command fnm -ErrorAction SilentlyContinue)) {
        fnm env --shell powershell | Out-String | Invoke-Expression
        fnm install 22
        fnm use 22
        $switched = $true
    }

    # Try nvm
    if (!$switched -and (Get-Command nvm -ErrorAction SilentlyContinue)) {
        nvm install 22
        nvm use 22
        $switched = $true
    }

    if (!$switched) {
        Write-Host "Error: Failed to find a compatible Node.js version and no supported version manager (fnm, nvm) could switch it." -ForegroundColor Red
        Pause
        exit 1
    }
}

# Detect available editors in the system
$availableEditors = @()
$editorCmds = @()
$editorSchemes = @()

function Check-Editor($Name, $Cmd, $Scheme) {
    if (Get-Command $Cmd -ErrorAction SilentlyContinue) {
        $script:availableEditors += $Name
        $script:editorCmds += $Cmd
        $script:editorSchemes += $Scheme
    }
}

Check-Editor "VS Code" "code" "vscode"
Check-Editor "VS Code Insiders" "code-insiders" "vscode-insiders"
Check-Editor "VSCodium" "codium" "vscodium"
Check-Editor "Cursor" "cursor" "cursor"
Check-Editor "Antigravity" "agy-ide" "agy"

if ($availableEditors.Count -eq 0) {
    Write-Host "Error: No supported editors found in your PATH." -ForegroundColor Red
    Pause
    exit 1
}

$autoChoice = $null
if ($targetScheme) {
    for ($i = 0; $i -lt $editorSchemes.Count; $i++) {
        if ($editorSchemes[$i] -eq $targetScheme) {
            $autoChoice = $i + 1
            break
        }
    }
}

if ($autoChoice) {
    $choice = $autoChoice.ToString()
} else {
    Write-Host "`nHint: If your editor is installed but not listed, you might need to add its command to your PATH." -ForegroundColor Yellow
    Write-Host "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and find a command like: `"Shell Command: Install 'cursor' command in PATH`" (or 'agy-ide', etc.)." -ForegroundColor Yellow

    Write-Host ""
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Write-Host "$($i + 1)) $($availableEditors[$i])"
    }
    if ($availableEditors.Count -gt 1) {
        Write-Host "a) All detected editors"
    }
    Write-Host "q) Quit`n"

    $choice = Read-Host "Select where to install CWC to"

    if ($choice -eq 'q' -or $choice -eq 'Q') {
        Write-Host "Installation cancelled."
        Pause
        exit 0
    } elseif ($choice -eq 'a' -or $choice -eq 'A') {
        if ($availableEditors.Count -le 1) {
            Write-Host "Error: Invalid choice. Exiting." -ForegroundColor Red
            Pause
            exit 1
        }
    } else {
        if ($choice -notmatch '^[0-9]+$' -or [int]$choice -lt 1 -or [int]$choice -gt $availableEditors.Count) {
            Write-Host "Error: Invalid choice. Exiting." -ForegroundColor Red
            Pause
            exit 1
        }
    }
}

Write-Host "`nFetching latest version info..."
$page = 1
$latestTag = $null

while ($page -le 10 -and !$latestTag) {
    $tagsUrl = "https://api.github.com/repos/robertpiosik/CodeWebChat/tags?page=$page"
    try {
        $tags = Invoke-RestMethod -Uri $tagsUrl
        if (!$tags -or $tags.Count -eq 0) { break }
        $latestTag = $tags | Where-Object { $_.name -match '-vscode$' } | Select-Object -First 1
    } catch {
        Write-Host "Error: Failed to fetch tags." -ForegroundColor Red
        Pause
        exit 1
    }
    $page++
}

if (!$latestTag) {
    Write-Host "Error: Could not find latest vscode tag." -ForegroundColor Red
    Pause
    exit 1
}

$zipUrl = $latestTag.zipball_url

$tmpDir = Join-Path $env:TEMP ("CWC_Install_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

$zipPath = Join-Path $tmpDir "source.zip"
Write-Host "Downloading latest source code..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting archive..."
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

# The extracted content is in a subfolder inside $tmpDir
$extractedDir = Get-ChildItem -Path $tmpDir -Directory | Select-Object -First 1

if (!$extractedDir) {
    Write-Host "Error: Extraction failed." -ForegroundColor Red
    Pause
    exit 1
}

Push-Location $extractedDir.FullName

Write-Host "Installing dependencies..."
$ErrorActionPreference = "Continue"
npx.cmd --yes pnpm install *>$null

Write-Host "Building extension..."
Set-Location apps/editor
npx.cmd --yes pnpm run build *>$null
$ErrorActionPreference = "Stop"

$vsixFile = Get-ChildItem *.vsix | Select-Object -First 1

if (!$vsixFile) {
    Write-Host "Error: VSIX file was not generated." -ForegroundColor Red
    Pop-Location
    Pause
    exit 1
}

function Install-ToEditor($idx) {
    $editorName = $availableEditors[$idx]
    $editorCmd = $editorCmds[$idx]
    $ErrorActionPreference = "Continue"
    & $editorCmd --install-extension $vsixFile.FullName --force *>$null
    $ErrorActionPreference = "Stop"
    Write-Host "Successfully installed to $editorName!"
}

Write-Host ""
if ($choice -eq 'a' -or $choice -eq 'A') {
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Install-ToEditor $i
    }
} else {
    Install-ToEditor ([int]$choice - 1)
}

Pause
Pop-Location
# Run cleanup in the background to avoid sluggish exit
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "rmdir", "/s", "/q", "`"$tmpDir`"" -WindowStyle Hidden
