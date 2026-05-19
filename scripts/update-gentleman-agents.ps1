<#
.SYNOPSIS
  Actualiza gentle-ai, engram y (si existe) agent-teams-lite en Windows usando Scoop cuando es posible.

.DESCRIPTION
  - Añade el bucket de Gentleman-Programming a Scoop si hace falta.
  - Instala o actualiza gentle-ai vía Scoop.
  - Intenta actualizar/instalar engram vía Scoop; si no está disponible, descarga el release oficial y lo instala en el layout de Scoop (apps\engram\<version> + current + shim).
  - Ejecuta `gentle-ai sync` en modo no interactivo cuando sea posible.
  - Crea una tarea programada de Windows (schtasks) llamada "GentlemanAgentsUpdate" que ejecuta este script diariamente a las 03:00.

  El script está pensado para ejecutarse automáticamente (modo "auto").

IMPORTANT: Ejecutar con PowerShell 5.1+ y permisos de usuario estándar. El script intenta instalar Scoop si no está presente (no requiere elevación normalmente).
#>

$ErrorActionPreference = 'Stop'

function Write-Log {
    param([string]$Message)
    $logDir = Join-Path -Path $env:LOCALAPPDATA -ChildPath "GentlemanUpdate"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
    $logFile = Join-Path $logDir 'update.log'
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts  $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Starting Gentleman-Programming agents auto-update (auto mode)"

# Helper: run external commands and log failures
function Run-Command {
    param([string]$Cmd)
    Write-Log "CMD: $Cmd"
    try {
        iex $Cmd
        return $true
    } catch {
        Write-Log "Command failed: $Cmd -- $_"
        return $false
    }
}

# Detect Scoop
function Ensure-Scoop {
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Log "Scoop detected: $(Get-Command scoop)."
        return $true
    }

    Write-Log "Scoop not found. Attempting non-interactive install of Scoop."
    try {
        # Try to set local execution policy for current user (best-effort)
        Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction SilentlyContinue
        # Official one-liner installer
        iex ((New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh'))
        if (Get-Command scoop -ErrorAction SilentlyContinue) {
            Write-Log "Scoop installed successfully."
            return $true
        } else {
            Write-Log "Scoop install did not make 'scoop' available in the session. You may need to re-open PowerShell."
            return $false
        }
    } catch {
        Write-Log "Failed to install Scoop automatically: $_"
        return $false
    }
}

if (-not (Ensure-Scoop)) {
    Write-Log "Scoop is required for the preferred install path. Exiting."
    exit 1
}

# Ensure gentleman bucket exists
$bucketName = 'gentleman'
$bucketUrl = 'https://github.com/Gentleman-Programming/scoop-bucket'

try {
    $buckets = scoop bucket list 2>&1
} catch {
    $buckets = ""
}

if ($buckets -notmatch [regex]::Escape($bucketName)) {
    Write-Log "Adding bucket '$bucketName' from $bucketUrl"
    try {
        scoop bucket add $bucketName $bucketUrl 2>&1 | ForEach-Object { Write-Log $_ }
    } catch {
        # Use formatted string to avoid parsing issues when a variable is immediately
        # followed by a colon in a double-quoted string.
        Write-Log ("Failed to add bucket {0}: {1}" -f $bucketName, $_)
    }
} else {
    Write-Log "Bucket '$bucketName' already configured."
}

# Update scoop manifests
Write-Log "Updating scoop manifests..."
# Refresh scoop buckets and manifests
scoop update * 2>&1 | ForEach-Object { Write-Log $_ }

# Install/update gentle-ai
Write-Log "Installing/updating gentle-ai via scoop..."
try {
    $installed = scoop list 2>$null | Select-String '^gentle-ai' -Quiet
} catch {
    $installed = $false
}

if ($installed) {
    Write-Log "gentle-ai is installed; attempting 'scoop update gentle-ai'"
    scoop update gentle-ai 2>&1 | ForEach-Object { Write-Log $_ }
} else {
    Write-Log "gentle-ai not found; attempting 'scoop install gentle-ai'"
    scoop install gentle-ai 2>&1 | ForEach-Object { Write-Log $_ }
}

# Resolve gentle-ai executable path
$gentleExe = $null
try {
    $cmd = Get-Command gentle-ai -ErrorAction SilentlyContinue
    if ($cmd) { $gentleExe = $cmd.Path }
} catch { }

if (-not $gentleExe) {
    $candidate = Join-Path $env:USERPROFILE 'scoop\shims\gentle-ai.exe'
    if (Test-Path $candidate) { $gentleExe = $candidate }
}

if ($gentleExe) {
    Write-Log "Found gentle-ai at: $gentleExe"
    # Try to run sync with common non-interactive flags
    $syncFlags = @('--yes','--non-interactive','-y')
    $synced = $false
    foreach ($f in $syncFlags) {
        try {
            Write-Log "Trying: gentle-ai sync $f"
            & $gentleExe 'sync' $f 2>&1 | ForEach-Object { Write-Log $_ }
            if ($LASTEXITCODE -eq 0) { $synced = $true; break }
        } catch {
            Write-Log "gentle-ai sync $f failed: $_"
        }
    }
    if (-not $synced) {
        Write-Log "Retrying: gentle-ai sync (no flags)"
        try {
            & $gentleExe 'sync' 2>&1 | ForEach-Object { Write-Log $_ }
        } catch {
            Write-Log "gentle-ai sync failed: $_"
        }
    }
} else {
    Write-Log "gentle-ai executable not found after install. Skipping 'sync'."
}

# engram: try to update/install via scoop; if not present, download latest release and install into Scoop layout
Write-Log "Installing/updating engram..."
try {
    $hasEngram = scoop list 2>$null | Select-String '^engram' -Quiet
} catch { $hasEngram = $false }

if ($hasEngram) {
    Write-Log "engram installed via scoop; updating"
    scoop update engram 2>&1 | ForEach-Object { Write-Log $_ }
} else {
    # Try installing via scoop (manifest might exist in other buckets)
    Write-Log "Attempting 'scoop install engram' (may fail if no manifest)"
    try {
        scoop install engram 2>&1 | ForEach-Object { Write-Log $_ }
    } catch {
        Write-Log "scoop install engram threw an exception: $_"
    }

    # Determine whether 'engram' became available after the install attempt. If not, run fallback.
    $ok = (Get-Command engram -ErrorAction SilentlyContinue) -ne $null
    if (-not $ok) {
        try {
            $api = 'https://api.github.com/repos/Gentleman-Programming/engram/releases/latest'
            Write-Log "Fetching latest engram release metadata from $api"
            $rel = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'GentlemanUpdateScript' }
            $arch = if ($env:PROCESSOR_ARCHITECTURE -match 'ARM') { 'arm64' } else { 'amd64' }
            $asset = $rel.assets | Where-Object { $_.name -match "windows_(?:amd64|arm64)" -and $_.name -match $arch }
            if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -match 'windows_amd64' } }
            if (-not $asset) { throw "No suitable Windows asset found in release" }
            $url = $asset.browser_download_url
            Write-Log "Downloading engram asset: $($asset.name)"
            $tmpZip = Join-Path $env:TEMP ($asset.name)
            Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing

            $version = $rel.tag_name.TrimStart('v')
            $scoopApps = Join-Path $env:USERPROFILE 'scoop\apps'
            $engramDir = Join-Path $scoopApps 'engram'
            $versionDir = Join-Path $engramDir $version
            if (-not (Test-Path $versionDir)) { New-Item -ItemType Directory -Path $versionDir -Force | Out-Null }
            Write-Log "Extracting to $versionDir"
            Expand-Archive -LiteralPath $tmpZip -DestinationPath $versionDir -Force

            # Update 'current' junction
            $currentDir = Join-Path $engramDir 'current'
            if (Test-Path $currentDir) {
                Remove-Item -LiteralPath $currentDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            # Try to create a directory junction (works without admin)
            try {
                # Use cmd.exe to create junction; wrap paths in quotes to be safe
                cmd.exe /c "mklink /J `"$currentDir`" `"$versionDir`"" 2>&1 | ForEach-Object { Write-Log $_ }
            } catch {
                Write-Log ("Warning: could not create junction 'current' -> {0}: {1}" -f $versionDir, $_)
            }

            # Create a shim in scoop shims so engram is callable
            $shims = Join-Path $env:USERPROFILE 'scoop\shims'
            if (-not (Test-Path $shims)) { New-Item -ItemType Directory -Path $shims -Force | Out-Null }

            # Prefer an executable with 'engram' in its name; otherwise pick the first .exe found
            $exePath = Get-ChildItem -Path $versionDir -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -ieq '.exe' -and ($_.Name -match '(?i)engram') } | Select-Object -First 1
            if (-not $exePath) {
                $exePath = Get-ChildItem -Path $versionDir -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -ieq '.exe' } | Select-Object -First 1
            }

            if ($exePath) {
                $shimCmd = Join-Path $shims 'engram.cmd'
                # Use %USERPROFILE% in the shim so it's resolved at runtime for the user account
                $target = '"%USERPROFILE%\\scoop\\apps\\engram\\current\\' + $exePath.Name + '"'
                $shimContent = "@echo off`r`n" + $target + ' %*'
                Set-Content -Path $shimCmd -Value $shimContent -Encoding ASCII
                Write-Log ("Created shim: {0} -> {1}" -f $shimCmd, $exePath.FullName)
                # Verify availability in current session (may need new shell to pick up PATH)
                if (Get-Command engram -ErrorAction SilentlyContinue) {
                    Write-Log "engram command is now available in PATH."
                } else {
                    Write-Log "engram shim created but command not found in this session; a new shell may be required."
                }
            } else {
                Write-Log ("Could not find any .exe inside the archive; please inspect {0}" -f $versionDir)
            }
            Remove-Item -LiteralPath $tmpZip -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Log "Failed to download/install engram via fallback: $_"
        }
    }
}

# Optional: update local agent-teams-lite clones if present under common paths
Write-Log "Searching for local 'agent-teams-lite' clones in common locations..."
try {
    $commonPaths = @(
        [IO.Path]::Combine($env:USERPROFILE, 'agent-teams-lite'),
        [IO.Path]::Combine($env:USERPROFILE, 'projects', 'agent-teams-lite'),
        [IO.Path]::Combine($env:USERPROFILE, 'dev', 'agent-teams-lite'),
        [IO.Path]::Combine($env:USERPROFILE, 'Documents', 'agent-teams-lite')
    )
    foreach ($p in $commonPaths) {
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        if (Test-Path $p) {
            Write-Log "Found agent-teams-lite at $p. Attempting git pull + re-run setup if available."
            if (Get-Command git -ErrorAction SilentlyContinue) {
                try { git -C $p pull 2>&1 | ForEach-Object { Write-Log $_ } } catch { Write-Log ("git pull failed for {0}: {1}" -f $p, $_) }
                $setupPs1 = Join-Path $p 'setup.ps1'
                if (Test-Path $setupPs1) {
                    Write-Log "Running setup.ps1 in $p"
                    try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setupPs1 2>&1 | ForEach-Object { Write-Log $_ } } catch { Write-Log "setup.ps1 failed: $_" }
                }
            } else {
                Write-Log "git not available; cannot update local clone at $p"
            }
        }
    }
} catch {
    Write-Log "Error while searching/updating local agent-teams-lite clones: $_"
}

# Create scheduled task to run this script daily at 03:00 if not exists
$taskName = 'GentlemanAgentsUpdate'
# Use the wrapper script path so the scheduled task adds shims to PATH before running the update
$scriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) 'run-update-with-scoop.ps1'
if (-not (Test-Path $scriptPath)) {
    # Fallback to this script itself if wrapper not found
    $scriptPath = $MyInvocation.MyCommand.Definition
}

# Query task existence without letting schtasks stderr trigger Stop error preference
$oldPref = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$null = schtasks /Query /TN $taskName 2>&1
$taskExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $oldPref

if ($taskExists) {
    Write-Log "Scheduled task '$taskName' already exists. Skipping creation."
} else {
    try {
        $time = '03:00'
        $action = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $scriptPath + '"'
        Write-Log "Creating scheduled task '$taskName' to run daily at $time"
        Write-Log "Task action: $action"
        $oldPref2 = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        schtasks /Create /SC DAILY /TN $taskName /TR $action /ST $time /F 2>&1 | ForEach-Object { Write-Log $_ }
        $ErrorActionPreference = $oldPref2
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Scheduled task '$taskName' created successfully."
        } else {
            Write-Log "schtasks /Create exited with code $LASTEXITCODE"
        }
    } catch {
        Write-Log ("Failed to create scheduled task: {0}" -f $_)
    }
}

Write-Log "Update run complete."
