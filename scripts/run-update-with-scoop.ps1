<#
.SYNOPSIS
  Wrapper that ensures Scoop's shims are available in the current PowerShell session
  and then runs scripts/update-gentleman-agents.ps1

.DESCRIPTION
  The Scoop installer writes its shims into %USERPROFILE%\scoop\shims which is added to
  the user PATH for future shells. This wrapper prepends that shims path to the current
  session PATH so the already-installed 'scoop' command is available immediately, then
  invokes the existing update script in-process so it sees the adjusted PATH.
#>

$ErrorActionPreference = 'Stop'

$shims = Join-Path $env:USERPROFILE 'scoop\shims'
if (Test-Path $shims) {
    Write-Output "Adding '$shims' to PATH for current session"
    # Prepend so shims take precedence for this process
    $env:Path = $shims + ';' + $env:Path
} else {
    Write-Output "Scoop shims not found at $shims - continuing without modifying PATH"
}

# Run the main update script (in the same process so environment is preserved)
$scriptPath = Join-Path $PSScriptRoot 'update-gentleman-agents.ps1'
Write-Output "Running update script: $scriptPath"
try {
    & $scriptPath -Auto 2>&1 | ForEach-Object { Write-Output $_ }
    $code = $LASTEXITCODE
    Write-Output "Update script finished with exit code: $code"
    exit $code
} catch {
    Write-Output "Update script failed: $_"
    exit 1
}
