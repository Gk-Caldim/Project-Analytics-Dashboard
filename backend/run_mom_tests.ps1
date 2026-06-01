$pytest = "C:\Project_Dashboard\Project-Analytics-Dashboard\backend\venv\Scripts\pytest.exe"
$testfile = "C:\Project_Dashboard\Project-Analytics-Dashboard\backend\tests\test_mom.py"
$outfile = "C:\Project_Dashboard\Project-Analytics-Dashboard\backend\test_mom_results.txt"

$result = & $pytest $testfile --tb short -v 2>&1
$result | Out-File -FilePath $outfile -Encoding utf8 -Force
Write-Host "Exit code: $LASTEXITCODE"
Write-Host "Lines written: $($result.Count)"
$result
