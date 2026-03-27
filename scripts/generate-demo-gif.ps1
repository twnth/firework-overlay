Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class NativeMethods {
  [DllImport("gdi32.dll")]
  public static extern bool DeleteObject(IntPtr hObject);
}
"@

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root "public\demo.gif"
$outputDir = Split-Path -Parent $outputPath

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$width = 720
$height = 420
$frameCount = 30
$delay = 6
$seed = 42
$rng = [System.Random]::new($seed)

$bgStart = [System.Drawing.Color]::FromArgb(255, 8, 10, 26)
$bgEnd = [System.Drawing.Color]::FromArgb(255, 19, 35, 65)
$cardTop = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$cardBottom = [System.Drawing.Color]::FromArgb(255, 238, 244, 255)
$gold = [System.Drawing.Color]::FromArgb(255, 255, 209, 102)
$textMain = [System.Drawing.Color]::FromArgb(255, 245, 247, 255)
$textMuted = [System.Drawing.Color]::FromArgb(255, 188, 198, 220)

$bursts = @(
  @{
    X = 180.0; Y = 110.0; Start = 0.04; Duration = 0.48; Count = 36; Speed = 118.0;
    Colors = @(
      [System.Drawing.Color]::FromArgb(255, 255, 106, 72),
      [System.Drawing.Color]::FromArgb(255, 255, 196, 91),
      [System.Drawing.Color]::FromArgb(255, 255, 221, 168)
    )
  },
  @{
    X = 548.0; Y = 96.0; Start = 0.12; Duration = 0.44; Count = 34; Speed = 110.0;
    Colors = @(
      [System.Drawing.Color]::FromArgb(255, 255, 104, 144),
      [System.Drawing.Color]::FromArgb(255, 255, 172, 78),
      [System.Drawing.Color]::FromArgb(255, 255, 212, 120)
    )
  },
  @{
    X = 357.0; Y = 72.0; Start = 0.26; Duration = 0.52; Count = 42; Speed = 132.0;
    Colors = @(
      [System.Drawing.Color]::FromArgb(255, 255, 143, 77),
      [System.Drawing.Color]::FromArgb(255, 255, 228, 148),
      [System.Drawing.Color]::FromArgb(255, 255, 94, 109)
    )
  }
)

function New-FrameBitmap {
  param(
    [double]$progress
  )

  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $fullRect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $fullRect,
    $bgStart,
    $bgEnd,
    90
  )
  $graphics.FillRectangle($bgBrush, $fullRect)

  for ($i = 0; $i -lt 18; $i++) {
    $alpha = 8 + ($i * 2)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
    $size = 2 + ($i % 3)
    $x = ($i * 41 + 37) % $width
    $y = ($i * 29 + 64) % [int]($height * 0.55)
    $graphics.FillEllipse($brush, $x, $y, $size, $size)
    $brush.Dispose()
  }

  $glowBrush = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowBrush.AddEllipse(150, 220, 420, 170)
  $pathBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowBrush
  $pathBrush.CenterColor = [System.Drawing.Color]::FromArgb(110, 102, 165, 255)
  $pathBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 102, 165, 255))
  $graphics.FillPath($pathBrush, $glowBrush)
  $pathBrush.Dispose()
  $glowBrush.Dispose()

  $cardX = 160
  $cardY = 150
  $cardWidth = 400
  $cardHeight = 200
  $cardRect = New-Object System.Drawing.Rectangle $cardX, $cardY, $cardWidth, $cardHeight
  $shadowRect = New-Object System.Drawing.Rectangle ($cardX + 8), ($cardY + 12), $cardWidth, $cardHeight
  $radius = 28

  function New-RoundedPath([System.Drawing.Rectangle]$rect, [int]$cornerRadius) {
    $diameter = $cornerRadius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
  }

  $shadowPath = New-RoundedPath $shadowRect $radius
  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 2, 6, 18))
  $graphics.FillPath($shadowBrush, $shadowPath)
  $shadowBrush.Dispose()
  $shadowPath.Dispose()

  $cardPath = New-RoundedPath $cardRect $radius
  $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($cardRect, $cardTop, $cardBottom, 90)
  $graphics.FillPath($cardBrush, $cardPath)
  $cardBrush.Dispose()

  $outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 156, 180, 255), 1.5)
  $graphics.DrawPath($outlinePen, $cardPath)
  $outlinePen.Dispose()
  $cardPath.Dispose()

  $badgePulse = 1.0 + ([Math]::Sin($progress * [Math]::PI * 2.0) * 0.04)
  $badgeSize = [int](62 * $badgePulse)
  $badgeX = [int](($width - $badgeSize) / 2)
  $badgeY = 122 - [int](($badgeSize - 62) / 2)

  $badgeGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(80, 255, 209, 102))
  $graphics.FillEllipse($badgeGlow, $badgeX - 10, $badgeY - 10, $badgeSize + 20, $badgeSize + 20)
  $badgeGlow.Dispose()

  $badgeBrush = New-Object System.Drawing.SolidBrush $gold
  $graphics.FillEllipse($badgeBrush, $badgeX, $badgeY, $badgeSize, $badgeSize)
  $badgeBrush.Dispose()

  $checkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 30, 44, 70), 7)
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($checkPen, 328, 149, 347, 169)
  $graphics.DrawLine($checkPen, 347, 169, 387, 132)
  $checkPen.Dispose()

  $labelFont = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)

  $centerFormat = New-Object System.Drawing.StringFormat
  $centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

  $textBrush = New-Object System.Drawing.SolidBrush $textMain
  $mutedBrush = New-Object System.Drawing.SolidBrush $textMuted
  $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 155, 93))

  $graphics.DrawString("PERFECT SCORE", $labelFont, $accentBrush, [System.Drawing.RectangleF]::new(0, 194, $width, 24), $centerFormat)
  $graphics.DrawString("Quiz complete", $titleFont, $textBrush, [System.Drawing.RectangleF]::new(0, 220, $width, 42), $centerFormat)
  $graphics.DrawString("Reward unlocked | confetti moment | zero layout blocking", $bodyFont, $mutedBrush, [System.Drawing.RectangleF]::new(0, 270, $width, 26), $centerFormat)

  $chipRect = New-Object System.Drawing.Rectangle 255, 306, 210, 32
  $chipPath = New-RoundedPath $chipRect 16
  $chipBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 241, 246, 255))
  $chipPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 146, 171, 228), 1)
  $graphics.FillPath($chipBrush, $chipPath)
  $graphics.DrawPath($chipPen, $chipPath)
  $graphics.DrawString("pointer-events: none", $bodyFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 59, 72, 103))), [System.Drawing.RectangleF]::new(255, 306, 210, 32), $centerFormat)
  $chipBrush.Dispose()
  $chipPen.Dispose()
  $chipPath.Dispose()

  foreach ($burst in $bursts) {
    $local = ($progress - $burst.Start) / $burst.Duration
    if ($local -lt 0.0 -or $local -gt 1.0) {
      continue
    }

    $life = [Math]::Min(1.0, [Math]::Max(0.0, $local))
    $radiusScale = [Math]::Pow($life, 0.72)
    $alphaBase = [int](255 * (1.0 - $life))

    $coreGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([Math]::Max(0, [Math]::Min(120, $alphaBase / 2)), 255, 224, 184))
    $coreSize = 26 + (36 * $radiusScale)
    $graphics.FillEllipse($coreGlow, $burst.X - ($coreSize / 2), $burst.Y - ($coreSize / 2), $coreSize, $coreSize)
    $coreGlow.Dispose()

    for ($i = 0; $i -lt $burst.Count; $i++) {
      $angle = (($i / $burst.Count) * [Math]::PI * 2.0) + ($burst.Start * 4.0)
      $distance = $burst.Speed * $radiusScale * (0.65 + (($i % 5) * 0.08))
      $drift = (1.0 - $life) * 12.0
      $px = $burst.X + ([Math]::Cos($angle) * $distance)
      $py = $burst.Y + ([Math]::Sin($angle) * $distance) + ($life * $life * 46.0) + (($i % 3) - 1) * $drift
      $sparkSize = 5.5 - ($life * 2.2) + (($i % 4) * 0.12)
      $color = $burst.Colors[$i % $burst.Colors.Count]
      $sparkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([Math]::Max(0, [Math]::Min(255, $alphaBase)), $color.R, $color.G, $color.B))
      $graphics.FillEllipse($sparkBrush, $px - ($sparkSize / 2), $py - ($sparkSize / 2), $sparkSize, $sparkSize)
      $sparkBrush.Dispose()
    }
  }

  $bgBrush.Dispose()
  $labelFont.Dispose()
  $titleFont.Dispose()
  $bodyFont.Dispose()
  $centerFormat.Dispose()
  $textBrush.Dispose()
  $mutedBrush.Dispose()
  $accentBrush.Dispose()
  $graphics.Dispose()

  return $bitmap
}

function Convert-BitmapToFrame {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$FrameDelay
  )

  $hBitmap = $Bitmap.GetHbitmap()
  try {
    $source = [System.Windows.Interop.Imaging]::CreateBitmapSourceFromHBitmap(
      $hBitmap,
      [IntPtr]::Zero,
      [System.Windows.Int32Rect]::Empty,
      [System.Windows.Media.Imaging.BitmapSizeOptions]::FromEmptyOptions()
    )

    $metadata = New-Object System.Windows.Media.Imaging.BitmapMetadata "gif"
    $metadata.SetQuery("/grctlext/Delay", [uint16]$FrameDelay)
    $metadata.SetQuery("/grctlext/Disposal", [byte]2)

    return [System.Windows.Media.Imaging.BitmapFrame]::Create($source, $null, $metadata, $null)
  }
  finally {
    [NativeMethods]::DeleteObject($hBitmap) | Out-Null
    $Bitmap.Dispose()
  }
}

$encoder = New-Object System.Windows.Media.Imaging.GifBitmapEncoder

for ($frameIndex = 0; $frameIndex -lt $frameCount; $frameIndex++) {
  $progress = $frameIndex / [double]($frameCount - 1)
  $bitmap = New-FrameBitmap -progress $progress
  $frame = Convert-BitmapToFrame -Bitmap $bitmap -FrameDelay $delay
  $encoder.Frames.Add($frame)
}

$stream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
try {
  $encoder.Save($stream)
}
finally {
  $stream.Dispose()
}

Write-Output "Generated $outputPath"
