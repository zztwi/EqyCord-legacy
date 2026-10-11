# EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
param([Parameter(Mandatory)][string]$Output)
Add-Type -AssemblyName System.Drawing
$images = @()
foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
    $bitmap = [Drawing.Bitmap]::new($size, $size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([Drawing.Color]::Transparent)
    # Same Phantom outline as surface.html, scaled from the 64-unit vector.
    $graphics.ScaleTransform([single]($size / 56.0), [single]($size / 56.0))
    $graphics.TranslateTransform(-4, -3)
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddLine(12, 50, 12, 28)
    $path.AddBezier(12, 28, 12, 15, 20, 7, 32, 7)
    $path.AddBezier(32, 7, 44, 7, 52, 15, 52, 28)
    $path.AddLine(52, 28, 52, 50)
    $path.AddBezier(52, 50, 52, 53, 49, 54, 47, 52)
    $path.AddLine(47, 52, 40, 46)
    $path.AddLine(40, 46, 34, 53)
    $path.AddBezier(34, 53, 33, 55, 31, 55, 30, 53)
    $path.AddLine(30, 53, 24, 46)
    $path.AddLine(24, 46, 17, 52)
    $path.AddBezier(17, 52, 15, 54, 12, 53, 12, 50)
    $path.CloseFigure()
    $fill = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(39, 40, 43))
    $graphics.FillPath($fill, $path)
    # Keep the black Phantom visible on dark desktops and taskbars.
    $outline = [Drawing.Pen]::new([Drawing.Color]::FromArgb(235, 235, 232), [single]1.5)
    $graphics.DrawPath($outline, $path)
    $pen = [Drawing.Pen]::new([Drawing.Color]::White, [single]3.5)
    $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($pen, 22, 28, 29, 31)
    $graphics.DrawLine($pen, 42, 28, 35, 31)
    $stream = [IO.MemoryStream]::new()
    $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
    $images += ,@{Size=$size; Bytes=$stream.ToArray()}
    $stream.Dispose(); $pen.Dispose(); $outline.Dispose(); $fill.Dispose(); $path.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$outputStream = [IO.File]::Create($Output)
$writer = [IO.BinaryWriter]::new($outputStream)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
    $offset = 6 + 16 * $images.Count
    foreach ($image in $images) {
        $dimension = if ($image.Size -eq 256) { 0 } else { $image.Size }
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$image.Bytes.Length); $writer.Write([uint32]$offset)
        $offset += $image.Bytes.Length
    }
    foreach ($image in $images) { $writer.Write([byte[]]$image.Bytes) }
} finally { $writer.Dispose(); $outputStream.Dispose() }
