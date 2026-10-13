# Convert ../<Name>.docx to ../<Name>.pdf with Word and print the page count.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads it in the system codepage.
#   powershell -File to_pdf.ps1                    -> HW1_report
#   powershell -File to_pdf.ps1 HW1_report_plain   -> plain-language version
param([string]$Name = "HW1_report")
$docx = Join-Path $PSScriptRoot "..\$Name.docx" | Resolve-Path
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
