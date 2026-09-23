$ErrorActionPreference = 'Stop'
$calendarShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Geonoh Calendar.url'
if (Test-Path -LiteralPath $calendarShortcut) { Remove-Item -LiteralPath $calendarShortcut }
Write-Output 'Calendar automatic startup is disabled.'
