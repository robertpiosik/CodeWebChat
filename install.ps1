$ErrorActionPreference = "Stop"

# Check git first
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: git is required but not installed." -ForegroundColor Red
    Pause
    exit 1
}

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

function Check-Editor($Name, $Cmd) {
    if (Get-Command $Cmd -ErrorAction SilentlyContinue) {
        $script:availableEditors += $Name
        $script:editorCmds += $Cmd
    }
}

Check-Editor "VS Code" "code"
Check-Editor "VS Code Insiders" "code-insiders"
Check-Editor "VSCodium" "codium"
Check-Editor "Cursor" "cursor"
Check-Editor "Antigravity" "agy-ide"

Write-Host "`nHint: If your editor is installed but not listed, you might need to add its command to your PATH." -ForegroundColor Yellow
Write-Host "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and find a command like: `"Shell Command: Install 'cursor' command in PATH`" (or 'agy-ide', etc.)." -ForegroundColor Yellow

if ($availableEditors.Count -eq 0) {
    Write-Host "Error: No supported editors found in your PATH." -ForegroundColor Red
    Pause
    exit 1
}

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

$tmpDir = Join-Path $env:TEMP ("CWC_Install_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
Write-Host "`nCloning repository into temporary directory..."
git clone -c core.longpaths=true -q --depth 1 https://github.com/robertpiosik/CodeWebChat.git $tmpDir

Push-Location $tmpDir

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
