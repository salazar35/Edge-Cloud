Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 30 @(
    @{Name='ProcessName';Expression={$_.Name}},
    @{Name='PID';Expression={$_.Id}},
    @{Name='RAM_MB';Expression={[math]::Round($_.WorkingSet64/1MB,2)}},
    @{Name='RAM_GB';Expression={[math]::Round($_.WorkingSet64/1GB,3)}},
    @{Name='Company';Expression={$_.Company}},
    @{Name='Description';Expression={$_.Description}}
) | Format-Table -AutoSize