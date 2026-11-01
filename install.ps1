$ErrorActionPreference = "Stop"
$targetScheme = $args[0]

function Fail($Message) {
    Write-Host "Error: $Message" -ForegroundColor Red
    Pause
    exit 1
}

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "git is required but not installed."
}

$nodeIsGood = (Get-Command node -ErrorAction SilentlyContinue) -and ([version]((node -v) -replace '^v','')).Major -ge 20

if (!$nodeIsGood) {
    if (Get-Command fnm -ErrorAction SilentlyContinue) {
        fnm env --shell powershell | Out-String | Invoke-Expression
        fnm install 22 *>$null
        fnm use 22 *>$null
    } elseif (Get-Command nvm -ErrorAction SilentlyContinue) {
        nvm install 22 *>$null
        nvm use 22 *>$null
    } else {
        Fail "Failed to find a compatible Node.js version and no supported version manager (fnm, nvm) could switch it."
    }
}

$editorsToCheck = @(
    @{ Name = "VS Code"; Cmd = "code"; Scheme = "vscode" },
    @{ Name = "VS Code Insiders"; Cmd = "code-insiders"; Scheme = "vscode-insiders" },
    @{ Name = "VSCodium"; Cmd = "codium"; Scheme = "vscodium" },
    @{ Name = "Cursor"; Cmd = "cursor"; Scheme = "cursor" },
    @{ Name = "Antigravity"; Cmd = "agy-ide"; Scheme = "agy" }
)

$availableEditors = @($editorsToCheck | Where-Object { Get-Command $_.Cmd -ErrorAction SilentlyContinue })

if ($availableEditors.Count -eq 0) {
    Fail "No supported editors found in your PATH."
}

$idx = [Array]::IndexOf(@($availableEditors.Scheme), $targetScheme)

if ($targetScheme -and $idx -ge 0) {
    $selectedIndex = $idx
} else {
    Write-Host "`nHint: If your editor is installed but not listed, you might need to add its command to your PATH." -ForegroundColor Yellow
    Write-Host "Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and find a command like: `"Shell Command: Install 'cursor' command in PATH`" (or 'agy-ide', etc.)." -ForegroundColor Yellow

    Write-Host ""
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Write-Host "$($i + 1)) $($availableEditors[$i].Name)"
    }
    if ($availableEditors.Count -gt 1) {
        Write-Host "a) All detected editors"
    }
    Write-Host "q) Quit`n"

    $choice = Read-Host "Select where to install CWC to"

    if ($choice -eq 'q') {
        Write-Host "Installation cancelled."
        Pause
        exit 0
    } elseif ($choice -eq 'a') {
        if ($availableEditors.Count -le 1) {
            Fail "Invalid choice. Exiting."
        }
        $installAll = $true
    } else {
        if ($choice -notmatch '^[0-9]+$' -or [int]$choice -lt 1 -or [int]$choice -gt $availableEditors.Count) {
            Fail "Invalid choice. Exiting."
        }
        $selectedIndex = [int]$choice - 1
    }
}

function Invoke-Step {
    param([string]$Message, [scriptblock]$Action, [string]$ErrorMsg)
    Write-Progress -Activity "CodeWebChat Installation" -Status $Message
    Write-Host -NoNewline "  $Message"
    & $Action
    $ok = $?
    Write-Progress -Activity "CodeWebChat Installation" -Completed
    if ($ok) { Write-Host "`r$([char]0x2714)" -ForegroundColor Green }
    else     { Write-Host "`r$([char]0x2718)" -ForegroundColor Red }
    if (!$ok -and $ErrorMsg) { Fail $ErrorMsg }
    return $ok
}

Write-Host ""

$originalLocation = Get-Location
$tmpDir = Join-Path $env:TEMP ("CWC_Install_" + [Guid]::NewGuid().ToString().Substring(0,8))

try {

New-Item -ItemType Directory -Path $tmpDir | Out-Null

$extractedDir = Join-Path $tmpDir "source"

$null = Invoke-Step "Cloning repository..." {
    git clone -b main -c core.longpaths=true --quiet https://github.com/robertpiosik/CodeWebChat.git $extractedDir *>$null
} "Cloning repository failed."

Set-Location $extractedDir

$null = Invoke-Step "Installing dependencies..." {
    corepack.cmd pnpm install *>$null
} "Failed to install dependencies."

Set-Location apps/editor

$null = Invoke-Step "Building extension..." {
    corepack.cmd pnpm run build *>$null
} "Build failed."

$vsixFile = Get-ChildItem *.vsix -ErrorAction SilentlyContinue | Select-Object -First 1

if (!$vsixFile) {
    Fail "VSIX file was not generated."
}

function Install-ToEditor($idx) {
    $editor = $availableEditors[$idx]
    $ok = Invoke-Step "Installing to $($editor.Name)..." {
        & $editor.Cmd --install-extension $vsixFile.FullName --force *>$null
    }
    
    Write-Host ""
    if ($ok) {
        if ($targetScheme) {
            Write-Host "Updated successfully! Please restart the editor for changes to take effect."
        } else {
            Write-Host "Successfully installed to $($editor.Name)!"
        }
    } else {
        Write-Host "Error: Failed to install to $($editor.Name)." -ForegroundColor Red
    }
}

$indices = if ($installAll) { 0..($availableEditors.Count - 1) } else { $selectedIndex }
foreach ($i in $indices) { Install-ToEditor $i }

Set-Location $originalLocation

Write-Host ""
$null = Invoke-Step "Cleaning up..." {
    if (Test-Path $tmpDir) {
        Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} "Failed to clean up."

} finally {
    Set-Location $originalLocation -ErrorAction SilentlyContinue
    if (Test-Path $tmpDir) {
        Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Pause
