# Extract decorative corner elements from platdujour.jpg
# ============================================================================

Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Sorin\Documents\GitHub\indiesmenu\public\images\platdujour.jpg"
$outputDir = "C:\Users\Sorin\Documents\GitHub\indiesmenu\public\images\decorations"

# Create output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "Loading source image..." -ForegroundColor Cyan
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
$width = $sourceImage.Width
$height = $sourceImage.Height
Write-Host "Image size: ${width}x${height}" -ForegroundColor Green

# Calculate positions
$rightX = $width - 120
$bottomY = $height - 120
$centerX = ($width / 2) - 150
$centerBottomY = $height - 80

# Define crop regions (x, y, width, height)
$crops = @{
    "corner-top-left" = @(0, 0, 120, 120)
    "corner-top-right" = @($rightX, 0, 120, 120)
    "corner-bottom-left" = @(0, $bottomY, 120, 120)
    "corner-bottom-right" = @($rightX, $bottomY, 120, 120)
    "decoration-bottom-center" = @($centerX, $centerBottomY, 300, 80)
}

foreach ($name in $crops.Keys) {
    Write-Host "Extracting: $name..." -NoNewline

    $coords = $crops[$name]
    $x = $coords[0]
    $y = $coords[1]
    $w = $coords[2]
    $h = $coords[3]

    # Create a new bitmap for the cropped region
    $cropBitmap = New-Object System.Drawing.Bitmap($w, $h)
    $graphics = [System.Drawing.Graphics]::FromImage($cropBitmap)

    # Set high quality settings
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    # Define source and destination rectangles
    $srcRect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)

    # Draw the cropped region
    $graphics.DrawImage($sourceImage, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    # Save the cropped image
    $outputPath = Join-Path $outputDir "$name.png"
    $cropBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Clean up
    $graphics.Dispose()
    $cropBitmap.Dispose()

    $fileSize = [math]::Round((Get-Item $outputPath).Length / 1KB, 1)
    Write-Host " Done! ($fileSize KB)" -ForegroundColor Green
}

# Clean up source image
$sourceImage.Dispose()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All decorations extracted successfully!" -ForegroundColor Green
Write-Host "Location: $outputDir" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
