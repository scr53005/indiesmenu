# ============================================================================
# PWA Icon Resizer Script
# ============================================================================
#
# Purpose: Resize a source icon image to multiple sizes for PWA requirements
#
# Usage:
#   .\resize-icons.ps1 -SourcePath "C:\path\to\icon.png" -OutputDir "C:\path\to\output" -Sizes @(192, 512)
#
# Or use default paths (current script location):
#   .\resize-icons.ps1
#
# Parameters:
#   -SourcePath  : Path to the source icon file (default: ../public/icon.png)
#   -OutputDir   : Directory where resized icons will be saved (default: ../public/)
#   -Sizes       : Array of sizes to generate (default: @(192, 512))
#
# Example - Generate multiple sizes:
#   .\resize-icons.ps1 -Sizes @(72, 96, 128, 144, 152, 192, 384, 512)
#
# Note: Requires System.Drawing assembly (built into Windows/.NET)
# ============================================================================

param(
    [string]$SourcePath = "",
    [string]$OutputDir = "",
    [int[]]$Sizes = @(192, 512)
)

# Load the System.Drawing assembly for image manipulation
Add-Type -AssemblyName System.Drawing

# Get the script's directory to calculate relative paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set default paths if not provided
if ($SourcePath -eq "") {
    $SourcePath = Join-Path (Split-Path -Parent $scriptDir) "public\icon.png"
}

if ($OutputDir -eq "") {
    $OutputDir = Join-Path (Split-Path -Parent $scriptDir) "public"
}

# Verify source file exists
if (-not (Test-Path $SourcePath)) {
    Write-Error "Source file not found: $SourcePath"
    exit 1
}

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PWA Icon Resizer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Source: $SourcePath" -ForegroundColor Yellow
Write-Host "Output: $OutputDir" -ForegroundColor Yellow
Write-Host "Sizes:  $($Sizes -join ', ')" -ForegroundColor Yellow
Write-Host ""

# Load the source image
try {
    $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
    Write-Host "Loaded source image: $($sourceImage.Width)x$($sourceImage.Height)" -ForegroundColor Green
}
catch {
    Write-Error "Failed to load source image: $_"
    exit 1
}

# Process each size
$generatedFiles = @()

foreach ($size in $Sizes) {
    try {
        Write-Host "Creating ${size}x${size}..." -NoNewline

        # Create a new bitmap with the target size
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)

        # Get graphics object for high-quality rendering
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

        # Set high-quality interpolation mode for better resizing
        # HighQualityBicubic provides the best quality for downscaling
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        # Draw the source image scaled to the target size
        $graphics.DrawImage($sourceImage, 0, 0, $size, $size)

        # Save the resized image
        $outputPath = Join-Path $OutputDir "icon-$size.png"
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

        # Clean up resources
        $graphics.Dispose()
        $bitmap.Dispose()

        # Get file size for reporting
        $fileSize = [math]::Round((Get-Item $outputPath).Length / 1KB, 1)

        Write-Host " Done! ($fileSize KB)" -ForegroundColor Green
        $generatedFiles += $outputPath
    }
    catch {
        Write-Host " Failed!" -ForegroundColor Red
        Write-Error "Error creating ${size}x${size}: $_"
    }
}

# Clean up source image
$sourceImage.Dispose()

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successfully created $($generatedFiles.Count) icon(s):" -ForegroundColor Green
foreach ($file in $generatedFiles) {
    Write-Host "  - $(Split-Path -Leaf $file)" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
