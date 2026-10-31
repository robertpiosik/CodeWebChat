$ErrorActionPreference = "Stop"

# Check git first
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Error: git is required but not installed."
    exit 1
}

# Validate Node.js version
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Error: Node.js version 20 or higher is required."
    exit 1
}

$nodeVersion = (node -v) -replace '^v',''
$major = [int]($nodeVersion -split '\.')[0]
if ($major -lt 20) {
    Write-Error "Error: Node.js version 20 or higher is required (Node.js 22.x is recommended)."
    exit 1
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

if ($availableEditors.Count -eq 0) {
    Write-Host "Hint: If your editor is installed, you might need to add its command to your PATH." -ForegroundColor Yellow
    Write-Host "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and run a command like: `"Shell Command: Install 'cursor' command in PATH`" (or 'agy-ide', etc.)." -ForegroundColor Yellow
    Write-Error "Error: No supported editors found in your PATH."
    exit 1
}

Write-Host "Detected editors:"
for ($i = 0; $i -lt $availableEditors.Count; $i++) {
    Write-Host "$($i + 1)) $($availableEditors[$i])"
}
Write-Host "a) All detected editors"
Write-Host "q) Quit`n"

$choice = Read-Host "Select editor(s) to install CWC to"

if ($choice -eq 'q' -or $choice -eq 'Q') {
    Write-Host "Installation cancelled."
    exit 0
} elseif ($choice -ne 'a' -and $choice -ne 'A') {
    if ($choice -notmatch '^[0-9]+$' -or [int]$choice -lt 1 -or [int]$choice -gt $availableEditors.Count) {
        Write-Error "Invalid choice. Exiting."
        exit 1
    }
}

$tmpDir = Join-Path $env:TEMP ("CWC_Install_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
Write-Host "`nCloning repository into temporary directory..."
git clone -q --depth 1 https://github.com/robertpiosik/CodeWebChat.git $tmpDir

Push-Location $tmpDir

Write-Host "Installing dependencies..."
npx --yes pnpm install *>$null

Write-Host "Building extension..."
Set-Location apps/editor
npx --yes pnpm run build *>$null

$vsixFile = Get-ChildItem *.vsix | Select-Object -First 1

if (!$vsixFile) {
    Write-Error "Error: VSIX file was not generated."
    Pop-Location
    exit 1
}

function Install-ToEditor($idx) {
    $editorName = $availableEditors[$idx]
    $editorCmd = $editorCmds[$idx]
    Write-Host "Installing to $editorName..."
    & $editorCmd --install-extension $vsixFile.FullName --force *>$null
}

if ($choice -eq 'a' -or $choice -eq 'A') {
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Install-ToEditor $i
    }
} else {
    Install-ToEditor ([int]$choice - 1)
}

Write-Host "`nDone!"

Pop-Location
Remove-Item -Recurse -Force $tmpDir
