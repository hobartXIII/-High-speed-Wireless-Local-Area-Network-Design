# 用 Word 把 ../HW1_report.docx 轉成 ../HW1_report.pdf，並印出頁數
$docx = Join-Path $PSScriptRoot "..\HW1_report.docx" | Resolve-Path
$pdf = [IO.Path]::ChangeExtension($docx, ".pdf")
$word = New-Object -ComObject Word.Application
try {
    $doc = $word.Documents.Open($docx.Path, $false, $true)
    $doc.ExportAsFixedFormat($pdf, 17)   # 17 = wdExportFormatPDF
    "pages: " + $doc.ComputeStatistics(2)
    $doc.Close(0)
} finally {
    $word.Quit()
}
