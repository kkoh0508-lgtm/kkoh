param([Parameter(Mandatory=$true)][string]$Url)
$ErrorActionPreference = 'Stop'
$calendarUri = [Uri]$Url
if (-not $calendarUri.IsAbsoluteUri -or $calendarUri.Scheme -ne 'https' -or $Url.Contains("`r") -or $Url.Contains("`n")) { throw 'Enter your deployed HTTPS URL.' }
$calendarStartup = [Environment]::GetFolderPath('Startup')
$calendarShortcut = Join-Path $calendarStartup 'Geonoh Calendar.url'
[System.IO.File]::WriteAllText($calendarShortcut, "[InternetShortcut]`r`nURL=$($calendarUri.AbsoluteUri)`r`n", [System.Text.Encoding]::UTF8)
Write-Output "Calendar will open in your default browser after Windows sign-in: $calendarShortcut"
