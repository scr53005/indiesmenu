import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

def generate_qr_codes_and_overlay(uri_file_path, tables_file_path, template_file_path, output_directory="output_qrs"):
    """
    Generates QR codes and overlays table numbers onto an image template,
    handling transparent backgrounds by filling them with white.

    Args:
        uri_file_path (str): Path to the text file containing the base URI.
        tables_file_path (str): Path to the CSV file containing table numbers (one per line).
        template_file_path (str): Path to the template image file (expected to be PNG).
        output_directory (str): Directory where generated images will be saved.
    """
    # --- 1. Read Inputs ---
    try:
        # Use 'utf-8-sig' to correctly handle Byte Order Mark (BOM) if present
        with open(uri_file_path, 'r', encoding='utf-8-sig') as f:
            base_uri = f.read().strip()
        if not base_uri:
            raise ValueError(f"'{uri_file_path}' is empty or contains only whitespace.")
    except FileNotFoundError:
        print(f"Error: URI file not found at '{uri_file_path}'. Please check the path.")
        return
    except ValueError as e:
        print(f"Error reading URI file: {e}")
        return
    except Exception as e:
        print(f"An unexpected error occurred while reading '{uri_file_path}': {e}")
        return


    try:
        # Use 'utf-8-sig' for tables file as well for consistency
        with open(tables_file_path, 'r', encoding='utf-8-sig') as f:
            # Read each line, strip whitespace, and filter out empty lines
            table_numbers = [line.strip() for line in f if line.strip()]
        if not table_numbers:
            print(f"Warning: Tables file '{tables_file_path}' is empty. No QR codes will be generated.")
            return
    except FileNotFoundError:
        print(f"Error: Tables file not found at '{tables_file_path}'. Please check the path.")
        return
    except Exception as e:
        print(f"An unexpected error occurred while reading '{tables_file_path}': {e}")
        return

    # Create output directory if it doesn't exist
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
        print(f"Created output directory: '{output_directory}'")

    # --- Define Positions and Sizes ---
    QR_CODE_SIZE_PIXELS = 560  # Desired QR code size (width and height)
    QR_POS_X = 655             # X-coordinate for QR code's upper-left corner
    QR_POS_Y = 190              # Y-coordinate for QR code's upper-left corner

    TABLE_NUM_TEXT_POS_X = 650 # X-coordinate for table number text's upper-left corner
    TABLE_NUM_TEXT_POS_Y = 820 # Y-coordinate for table number text's upper-left corner
    FONT_SIZE = 38              # <--- Adjusted font size for readability (approx 56px height for '1')
    TEXT_COLOR = (0, 0, 0)      # Black color (RGB)

    # --- Resizing parameters for final image ---
    TARGET_WIDTH_CM = 15
    DPI = 300 # Dots Per Inch - crucial for print quality. This will be embedded in JPEG metadata.
    # Calculate target width in pixels from cm and DPI
    TARGET_WIDTH_PIXELS = int(TARGET_WIDTH_CM / 2.54 * DPI)
    print(f"Target final image width: {TARGET_WIDTH_PIXELS} pixels (based on {TARGET_WIDTH_CM}cm at {DPI} DPI)")

    # --- Font Loading ---
    font = None
    try:
        # IMPORTANT: Place 'Aptos.ttf' in the same directory as this script,
        # or provide the full path to your Aptos font file.
        font = ImageFont.truetype("Aptos.ttf", FONT_SIZE)
        print("Using Aptos font.")
    except IOError:
        print(f"Warning: Aptos.ttf font not found at the specified path. Attempting to use Arial.ttf.")
        try:
            # IMPORTANT: Ensure 'arial.ttf' is accessible, either in your system's font directories
            # or by placing a copy in the script's directory.
            font = ImageFont.truetype("arial.ttf", FONT_SIZE)
            print("Using Arial font.")
        except IOError:
            print(f"Warning: Arial.ttf font not found. Falling back to default Pillow bitmap font.")
            font = ImageFont.load_default()
    except Exception as e:
        print(f"An unexpected error occurred while loading the font: {e}. Falling back to default Pillow bitmap font.")
        font = ImageFont.load_default()

    # --- Process Each Table Number ---
    for i, table_num in enumerate(table_numbers):
        full_url = f"{base_uri}{table_num}"
        # Output filename will be JPEG as requested for white background
        output_filename = os.path.join(output_directory, f"Table_{table_num}_QR_Card.jpg")

        try:
            # Load the template image (it might be RGBA if it's a PNG with transparency)
            original_template_img = Image.open(template_file_path)

            # Create a new white background image with the same dimensions as the template
            # This will serve as the base, ensuring all transparent areas become white.
            base_image = Image.new("RGB", original_template_img.size, (255, 255, 255)) # White background

            # Paste the original template onto the white background.
            # If the original template has an alpha channel, use it as a mask.
            if original_template_img.mode == 'RGBA':
                base_image.paste(original_template_img, (0, 0), original_template_img)
            else:
                base_image.paste(original_template_img, (0, 0))

            # Now, 'base_image' is an RGB image with any previous transparent areas filled with white.
            # We will use this image for adding the QR code and text.
            current_image_to_compose = base_image

        except FileNotFoundError:
            print(f"Error: Template file not found at '{template_file_path}'. Skipping.")
            continue # Use continue to process next table if one template fails
        except Exception as e:
            print(f"Error opening or processing template file '{template_file_path}': {e}. Skipping.")
            continue

        # --- 2. Generate QR Code ---
        qr = qrcode.QRCode(
            version=None,  # Automatically determines the optimal version
            error_correction=qrcode.constants.ERROR_CORRECT_H, # Maximum error correction
            box_size=10,   # Initial size, will be resized
            border=0,      # Standard white border around the QR code modules
        )
        qr.add_data(full_url)
        qr.make(fit=True)

        # Create the QR code image (black dots on a white background)
        qr_img_raw = qr.make_image(fill_color="black", back_color="white")

        # Resize QR code to the exact desired dimensions
        qr_img_resized = qr_img_raw.resize((QR_CODE_SIZE_PIXELS, QR_CODE_SIZE_PIXELS), Image.LANCZOS)

        # --- 3. Image Manipulation (Pillow) ---
        # Paste QR Code onto the template (which now has a white background)
        current_image_to_compose.paste(qr_img_resized, (QR_POS_X, QR_POS_Y))

        # Add Table Number Text
        draw = ImageDraw.Draw(current_image_to_compose)
        # Text is positioned by its upper-left corner
        draw.text((TABLE_NUM_TEXT_POS_X, TABLE_NUM_TEXT_POS_Y), table_num, font=font, fill=TEXT_COLOR)

        # Save the output image as JPEG
        try:
            current_image_to_compose.save(output_filename, "JPEG")
            print(f"Generated: {output_filename}")
        except Exception as e:
            print(f"Error saving {output_filename}: {e}")

        # --- 4. Resize the final composed image ---
        original_width, original_height = current_image_to_compose.size
        # Calculate new height to maintain aspect ratio
        target_height_pixels = int(original_height * (TARGET_WIDTH_PIXELS / original_width))
        
        print(f"Resizing Table_{table_num}_QR_Card.jpg from {original_width}x{original_height} to {TARGET_WIDTH_PIXELS}x{target_height_pixels} pixels.")
        final_resized_image = current_image_to_compose.resize(
            (TARGET_WIDTH_PIXELS, target_height_pixels), 
            Image.BICUBIC # Cubic interpolation
        )

        # Save the output image as JPEG with DPI metadata
        try:
            final_resized_image.save(output_filename, "JPEG", dpi=(DPI, DPI)) # <--- ADDED DPI METADATA HERE
            print(f"Generated and resized: {output_filename}")
        except Exception as e:
            print(f"Error saving {output_filename}: {e}")

    print(f"\nSuccessfully processed {len(table_numbers)} table numbers.")
    print(f"All generated QR code images are in the '{output_directory}' directory.")

# --- Example Usage ---
if __name__ == "__main__":
    # Ensure these files are in the same directory as your script,
    # or provide their full paths.
    URI_FILE = "indiesuri.txt"
    TABLES_FILE = "indiestables.csv"
    # IMPORTANT: Ensure your template file is named 'TableQR-template.png'
    # and placed in the same directory as the script.
    TEMPLATE_FILE = "TableQR-template.png"
    OUTPUT_DIR = "output_qrs"

    generate_qr_codes_and_overlay(URI_FILE, TABLES_FILE, TEMPLATE_FILE, OUTPUT_DIR)