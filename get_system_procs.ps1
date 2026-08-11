# Các tiến trình hệ thống quan trọng và tiến trình ẩn
$systemProcs = @('System', 'Registry', 'Memory Compression', 'Secure System', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost', 'dwm', 'fontdrvhost', 'WUDFHost', 'dasHost', 'spoolsv', 'SearchIndexer', 'SecurityHealthService', 'SgrmBroker')

Write-Host "=== TIẾN TRÌNH HỆ THỐNG VÀ DỊCH VỤ ẨN ===" -ForegroundColor Cyan
Get-Process | Where-Object { $systemProcs -contains $_.Name -or $_.Name -like 'svchost*' -or $_.SessionId -eq 0 } | Sort-Object WorkingSet64 -Descending | Select-Object -First 25 @(
    @{Name='ProcessName';Expression={$_.Name}},
    @{Name='PID';Expression={$_.Id}},
    @{Name='RAM_MB';Expression={[math]::Round($_.WorkingSet64/1MB,2)}},
    @{Name='SessionId';Expression={$_.SessionId}},
    @{Name='Path';Expression={if($_.Path){$_.Path}else{'[System/Protected]'}}}
) | Format-Table -AutoSize

Write-Host "`n=== TỔNG HỢP THEO NHÓM TIẾN TRÌNH ===" -ForegroundColor Cyan
Get-Process | Group-Object Name | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        Count = $_.Count
        TotalRAM_MB = [math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 2)
        TotalRAM_GB = [math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1GB, 3)
    }
} | Sort-Object TotalRAM_MB -Descending | Select-Object -First 20 | Format-Table -AutoSize
