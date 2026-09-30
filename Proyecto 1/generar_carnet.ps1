<#
.SYNOPSIS
    Genera un carnet PDF de GMC Alimentos desde la línea de comandos de PowerShell.
.EXAMPLE
    .\generar_carnet.ps1 -Consecutivo "000125" -Nombres "Juan Carlos" -Apellidos "Pérez Rodríguez" -Identificacion "1025789341" -Expedicion "2026-09-29" -Vencimiento "2027-09-29"
#>
param(
    [Parameter(Mandatory=$false)][string]$Consecutivo = "000125",
    [Parameter(Mandatory=$false)][string]$Nombres = "ANDRES FELIPE",
    [Parameter(Mandatory=$false)][string]$Apellidos = "GOMEZ MARTINEZ",
    [Parameter(Mandatory=$false)][string]$Identificacion = "1025789341",
    [Parameter(Mandatory=$false)][string]$Expedicion = (Get-Date -Format "yyyy-MM-dd"),
    [Parameter(Mandatory=$false)][string]$Vencimiento = ((Get-Date).AddYears(1).ToString("yyyy-MM-dd")),
    [Parameter(Mandatory=$false)][string]$OutputFile = ""
)

# REGLA: Identificación SOLO números
$idLimpia = ($Identificacion -replace '\D', '')

# Parsear fechas
$expParts = $Expedicion.Split('-')
$vencParts = $Vencimiento.Split('-')

$expAnio = if ($expParts.Length -ge 1) { $expParts[0] } else { "" }
$expMes = if ($expParts.Length -ge 2) { $expParts[1] } else { "" }
$expDia = if ($expParts.Length -ge 3) { $expParts[2] } else { "" }

$vencAnio = if ($vencParts.Length -ge 1) { $vencParts[0] } else { "" }
$vencMes = if ($vencParts.Length -ge 2) { $vencParts[1] } else { "" }
$vencDia = if ($vencParts.Length -ge 3) { $vencParts[2] } else { "" }

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
    $safeName = ($Nombres + "_" + $Apellidos) -replace '[^a-zA-Z0-9_-]', '_'
    $OutputFile = Join-Path $PSScriptRoot "Carnet_${Consecutivo}_${safeName}.pdf"
}

$csharpCode = @'
using System;
using System.IO;
using System.Text;

public class CarnetCliGenerator {
    public static void CreatePdf(
        string basePdfPath,
        string outPdfPath,
        string consecutivo,
        string nombres,
        string apellidos,
        string identificacion,
        string expDia, string expMes, string expAnio,
        string vencDia, string vencMes, string vencAnio
    ) {
        byte[] basePdf = File.ReadAllBytes(basePdfPath);
        string baseStr = Encoding.ASCII.GetString(basePdf);

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("q");
        sb.AppendLine("/Perceptual ri");
        sb.AppendLine("595 0 0 743.75 0 75.125 cm");
        sb.AppendLine("/Im1 Do");
        sb.AppendLine("Q");

        // Consecutivo en Negro
        sb.AppendLine("BT");
        sb.AppendLine("/F1 18 Tf");
        sb.AppendLine("0.04 0.08 0.16 rg");
        float noLen = consecutivo.Length * 11.0f;
        float xNo = 303.7f - (noLen / 2.0f);
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:F1} 762 Td ({1}) Tj", xNo, consecutivo));
        sb.AppendLine("ET");

        // Nombres, Apellidos, Identificación (Tamaño aumentado a 18 Tf)
        sb.AppendLine("BT");
        sb.AppendLine("/F1 18 Tf");
        sb.AppendLine("0.04 0.08 0.16 rg");
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "142.5 605 Td ({0}) Tj", nombres));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "0 -31 Td ({0}) Tj", apellidos));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "16.5 -31 Td ({0}) Tj", identificacion));
        sb.AppendLine("ET");

        // Fechas Expedicion (Tamaño aumentado a 15 Tf)
        sb.AppendLine("BT");
        sb.AppendLine("/F1 15 Tf");
        sb.AppendLine("0.04 0.08 0.16 rg");
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "279 512 Td ({0}) Tj", expDia));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "117 0 Td ({0}) Tj", expMes));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "105 0 Td ({0}) Tj", expAnio));
        sb.AppendLine("ET");

        // Fechas Vencimiento (Tamaño aumentado a 15 Tf)
        sb.AppendLine("BT");
        sb.AppendLine("/F1 15 Tf");
        sb.AppendLine("0.04 0.08 0.16 rg");
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "279 481 Td ({0}) Tj", vencDia));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "117 0 Td ({0}) Tj", vencMes));
        sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "105 0 Td ({0}) Tj", vencAnio));
        sb.AppendLine("ET");

        string contentStream = sb.ToString();
        byte[] contentBytes = Encoding.ASCII.GetBytes(contentStream);

        int imObjIndex = baseStr.IndexOf("5 0 obj");
        int endObjIndex = baseStr.IndexOf("endobj", imObjIndex) + 6;
        int imObjLen = endObjIndex - imObjIndex;
        byte[] imObjBytes = new byte[imObjLen];
        Array.Copy(basePdf, imObjIndex, imObjBytes, 0, imObjLen);

        using (FileStream fs = new FileStream(outPdfPath, FileMode.Create)) {
            StreamWriter sw = new StreamWriter(fs, Encoding.ASCII);
            sw.NewLine = "\n";
            sw.WriteLine("%PDF-1.4");
            sw.Flush();

            long[] xref = new long[7];
            xref[0] = 0;

            xref[1] = fs.Position;
            sw.WriteLine("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
            sw.Flush();

            xref[2] = fs.Position;
            sw.WriteLine("2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj");
            sw.Flush();

            xref[3] = fs.Position;
            sw.WriteLine("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents 6 0 R >>\nendobj");
            sw.Flush();

            xref[4] = fs.Position;
            sw.WriteLine("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj");
            sw.Flush();

            xref[5] = fs.Position;
            fs.Write(imObjBytes, 0, imObjBytes.Length);
            fs.WriteByte((byte)'\n');
            fs.Flush();

            xref[6] = fs.Position;
            sw.WriteLine("6 0 obj\n<< /Length " + contentBytes.Length + " >>\nstream");
            sw.Flush();
            fs.Write(contentBytes, 0, contentBytes.Length);
            sw.WriteLine("\nendstream\nendobj");
            sw.Flush();

            long startxref = fs.Position;
            sw.WriteLine("xref");
            sw.WriteLine("0 7");
            sw.WriteLine("0000000000 65535 f ");
            for (int i = 1; i <= 6; i++) {
                sw.WriteLine(xref[i].ToString("D10") + " 00000 n ");
            }
            sw.WriteLine("trailer\n<< /Size 7 /Root 1 0 R >>");
            sw.WriteLine("startxref");
            sw.WriteLine(startxref);
            sw.WriteLine("%%EOF");
            sw.Flush();
        }
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'CarnetCliGenerator').Type) {
    Add-Type -TypeDefinition $csharpCode -Language CSharp
}

$basePdfPath = Join-Path $PSScriptRoot "CARNET BASE.pdf"
[CarnetCliGenerator]::CreatePdf(
    $basePdfPath,
    $OutputFile,
    $Consecutivo,
    $Nombres.ToUpper(),
    $Apellidos.ToUpper(),
    $idLimpia,
    $expDia, $expMes, $expAnio,
    $vencDia, $vencMes, $vencAnio
)

Write-Host "✅ Carnet generado exitosamente:" -ForegroundColor Green
Write-Host "   Archivo: $OutputFile" -ForegroundColor Cyan
Write-Host "   No: $Consecutivo | Nombres: $Nombres $Apellidos | Id: $idLimpia"
