$ErrorActionPreference = "Stop"
$targetScheme = if ($args.Count -gt 0) { $args[0] } else { $null }

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: git is required but not installed." -ForegroundColor Red
    Pause
    exit 1
}

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

    if (!$switched -and (Get-Command fnm -ErrorAction SilentlyContinue)) {
        fnm env --shell powershell | Out-String | Invoke-Expression
        fnm install 22 *>$null
        fnm use 22 *>$null
        $switched = $true
    }

    if (!$switched -and (Get-Command nvm -ErrorAction SilentlyContinue)) {
        nvm install 22 *>$null
        nvm use 22 *>$null
        $switched = $true
    }

    if (!$switched) {
        Write-Host "Error: Failed to find a compatible Node.js version and no supported version manager (fnm, nvm) could switch it." -ForegroundColor Red
        Pause
        exit 1
    }
}

$availableEditors = @()
$editorCmds = @()
$editorSchemes = @()

$editorsToCheck = @(
    @{ Name = "VS Code"; Cmd = "code"; Scheme = "vscode" },
    @{ Name = "VS Code Insiders"; Cmd = "code-insiders"; Scheme = "vscode-insiders" },
    @{ Name = "VSCodium"; Cmd = "codium"; Scheme = "vscodium" },
    @{ Name = "Cursor"; Cmd = "cursor"; Scheme = "cursor" },
    @{ Name = "Antigravity"; Cmd = "agy-ide"; Scheme = "agy" }
)

foreach ($editor in $editorsToCheck) {
    if (Get-Command $editor.Cmd -ErrorAction SilentlyContinue) {
        $availableEditors += $editor.Name
        $editorCmds += $editor.Cmd
        $editorSchemes += $editor.Scheme
    }
}

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

$global:activeSpinner = $null

function Start-Spinner {
    param([string]$Message)
    Write-Host -NoNewline "  $Message"
    try { [Console]::CursorVisible = $false } catch {}
    
    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.Open()
    $ps = [powershell]::Create()
    $ps.Runspace = $runspace
    $ps.AddScript({
        $spinner = @('-', '\', '|', '/')
        $i = 0
        while ($true) {
            try { [Console]::Write("`r$($spinner[$i % 4])") } catch {}
            $i++
            Start-Sleep -Milliseconds 100
        }
    }) | Out-Null
    $asyncResult = $ps.BeginInvoke()
    $spinnerObj = @{ PS = $ps; Runspace = $runspace; Message = $Message }
    $global:activeSpinner = $spinnerObj
    return $spinnerObj
}

function Stop-Spinner {
    param($spinnerObj, [bool]$Success = $true)
    if ($global:activeSpinner -and $spinnerObj -and $global:activeSpinner.PS -eq $spinnerObj.PS) {
        $global:activeSpinner = $null
    }
    $msg = if ($spinnerObj.Message) { $spinnerObj.Message } else { "" }
    if ($spinnerObj) {
        try { $spinnerObj.PS.Stop() } catch {}
        try { $spinnerObj.PS.Dispose() } catch {}
        try { $spinnerObj.Runspace.Close() } catch {}
        try { $spinnerObj.Runspace.Dispose() } catch {}
    }
    try { [Console]::CursorVisible = $true } catch {}
    
    if ($Success) {
        Write-Host "`r$([char]0x2714) " -ForegroundColor Green -NoNewline
        Write-Host $msg
    } else {
        Write-Host "`r$([char]0x2718) " -ForegroundColor Red -NoNewline
        Write-Host $msg
    }
}

Write-Host ""

try {

$tmpDir = Join-Path $env:TEMP ("CWC_Install_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

$extractedDir = Join-Path $tmpDir "source"

$spinner = Start-Spinner "Cloning repository..."
$ErrorActionPreference = "Continue"
git clone -b main -c core.longpaths=true --quiet https://github.com/robertpiosik/CodeWebChat.git $extractedDir *>$null
$cmdSuccess = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"
Stop-Spinner $spinner $cmdSuccess

if (!$cmdSuccess) {
    Write-Host "Error: Cloning repository failed." -ForegroundColor Red
    Pause
    exit 1
}

Push-Location $extractedDir

$spinner = Start-Spinner "Installing dependencies..."
$ErrorActionPreference = "Continue"
npx.cmd --yes pnpm install *>$null
$cmdSuccess = ($LASTEXITCODE -eq 0)
Stop-Spinner $spinner $cmdSuccess

if (!$cmdSuccess) {
    Write-Host "Error: Failed to install dependencies." -ForegroundColor Red
    Pause
    exit 1
}

$spinner = Start-Spinner "Building extension..."
Set-Location apps/editor
npx.cmd --yes pnpm run build *>$null
$cmdSuccess = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"
Stop-Spinner $spinner $cmdSuccess

if (!$cmdSuccess) {
    Write-Host "Error: Build failed." -ForegroundColor Red
    Pop-Location
    Pause
    exit 1
}

$vsixFile = Get-ChildItem *.vsix -ErrorAction SilentlyContinue | Select-Object -First 1

if (!$vsixFile) {
    Write-Host "Error: VSIX file was not generated." -ForegroundColor Red
    Pop-Location
    Pause
    exit 1
}

function Install-ToEditor($idx) {
    $editorName = $availableEditors[$idx]
    $editorCmd = $editorCmds[$idx]
    
    $spinner = Start-Spinner "Installing to $editorName..."
    $ErrorActionPreference = "Continue"
    & $editorCmd --install-extension $vsixFile.FullName --force *>$null
    $cmdSuccess = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = "Stop"
    
    Stop-Spinner $spinner $cmdSuccess
    
    Write-Host ""
    if ($cmdSuccess) {
        if ($targetScheme) {
            Write-Host "Updated successfully! Please restart the editor for changes to take effect."
        } else {
            Write-Host "Successfully installed to $editorName!"
        }
    } else {
        Write-Host "Error: Failed to install to $editorName." -ForegroundColor Red
    }
}

if ($choice -eq 'a' -or $choice -eq 'A') {
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Install-ToEditor $i
    }
} else {
    Install-ToEditor ([int]$choice - 1)
}

} finally {
    if ($global:activeSpinner) {
        Stop-Spinner $global:activeSpinner $false
    }
    try { [Console]::CursorVisible = $true } catch {}
}

Pause
Pop-Location
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "rmdir", "/s", "/q", "`"$tmpDir`"" -WindowStyle Hidden
