import argparse
import json
from datetime import datetime, UTC
from pathlib import Path

import numpy as np
from PIL import Image
from paddleocr import PaddleOCR


def load_bubble_json(json_path: str) -> dict:
    """Load bubble detection JSON file."""
    with open(json_path, "r") as f:
        return json.load(f)


def filter_text_regions(bubble_data: dict) -> list:
    """
    Filter detections to only include text regions.

    Returns detections with label_id 1 (text_bubble) or 2 (text_free).
    """
    return [
        det
        for det in bubble_data.get("detections", [])
        if det.get("label_id") in [1, 2]
    ]


def crop_region(image: Image.Image, bbox: dict) -> Image.Image:
    """
    Crop a region from the image using bbox coordinates.

    Args:
        image: PIL Image
        bbox: dict with x1, y1, x2, y2 keys

    Returns:
        Cropped PIL Image
    """
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]

    # Clamp coordinates to image bounds
    width, height = image.size
    x1 = max(0, int(x1))
    y1 = max(0, int(y1))
    x2 = min(width, int(x2))
    y2 = min(height, int(y2))

    # Check if crop is valid
    if x2 <= x1 or y2 <= y1:
        return None

    # Check minimum size (skip very small regions)
    if (x2 - x1) < 20 or (y2 - y1) < 20:
        return None

    return image.crop((x1, y1, x2, y2))


def run_ocr_on_crop(ocr, crop: Image.Image) -> dict:
    """
    Run OCR on a cropped image region.

    Returns:
        dict with text_lines, full_text, avg_confidence, or error
    """
    try:
        # Convert PIL Image to numpy array for PaddleOCR
        crop_array = np.array(crop)

        # Run OCR
        result = ocr.predict(crop_array)

        if not result or not result[0]:
            return {
                "text_lines": [],
                "full_text": "",
                "avg_confidence": 0.0,
                "error": "No text detected"
            }

        # Extract text lines and confidence scores
        text_lines = []
        total_confidence = 0.0

        rec_texts = result[0].get("rec_texts", [])
        rec_scores = result[0].get("rec_scores", [])

        for text, score in zip(rec_texts, rec_scores):
            text_lines.append({
                "text": text,
                "confidence": round(float(score), 4)
            })
            total_confidence += float(score)

        # Calculate average confidence
        avg_confidence = (
            total_confidence / len(text_lines) if text_lines else 0.0
        )

        # Combine all text lines
        full_text = "\n".join([line["text"] for line in text_lines])

        return {
            "text_lines": text_lines,
            "full_text": full_text,
            "avg_confidence": round(avg_confidence, 4)
        }

    except Exception as e:
        return {
            "text_lines": [],
            "full_text": "",
            "avg_confidence": 0.0,
            "error": f"OCR failed: {str(e)}"
        }


def process_image(
    image_path: str,
    bubble_json_path: str,
    lang: str = "chinese_cht",
    confidence_threshold: float = 0.5,
) -> dict:
    """
    Process an image and run OCR on detected text bubbles.

    Args:
        image_path: Path to the comic page image
        bubble_json_path: Path to bubble detection JSON
        lang: OCR language (default: chinese_cht)
        confidence_threshold: Minimum confidence to include results

    Returns:
        dict with OCR results
    """
    print(f"Loading image: {image_path}")
    image = Image.open(image_path).convert("RGB")
    width, height = image.size

    print(f"Loading bubble detections: {bubble_json_path}")
    bubble_data = load_bubble_json(bubble_json_path)

    # Filter to text regions only
    text_regions = filter_text_regions(bubble_data)
    print(f"Found {len(text_regions)} text regions to process")

    # Initialize PaddleOCR
    print(f"Initializing PaddleOCR (lang={lang})...")
    ocr = PaddleOCR(
        lang=lang,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

    # Process each text region
    results = []
    for idx, detection in enumerate(text_regions, 1):
        print(f"Processing region {idx}/{len(text_regions)}...", end=" ")

        bbox = detection["bbox"]
        crop = crop_region(image, bbox)

        if crop is None:
            print("SKIPPED (invalid crop)")
            ocr_result = {
                "text_lines": [],
                "full_text": "",
                "avg_confidence": 0.0,
                "error": "Invalid crop region"
            }
        else:
            ocr_result = run_ocr_on_crop(ocr, crop)

            if ocr_result.get("error"):
                print(f"ERROR: {ocr_result['error']}")
            elif ocr_result["avg_confidence"] < confidence_threshold:
                print(f"LOW CONFIDENCE ({ocr_result['avg_confidence']:.2f})")
            else:
                print(f"OK ({len(ocr_result['text_lines'])} lines, conf={ocr_result['avg_confidence']:.2f})")

        # Add OCR result to detection
        result_entry = {
            "label": detection["label"],
            "label_id": detection["label_id"],
            "confidence": detection["confidence"],
            "bbox": bbox,
            "ocr_result": ocr_result
        }
        results.append(result_entry)

    # Build output structure
    output = {
        "image_info": {
            "path": str(image_path),
            "width": width,
            "height": height
        },
        "detections": results,
        "ocr_config": {
            "lang": lang,
            "model": "paddleocr",
            "version": "3.3.2",
            "confidence_threshold": confidence_threshold
        },
        "source_bubble_file": str(bubble_json_path),
        "processed_at": datetime.now(UTC).isoformat().replace('+00:00', 'Z')
    }

    return output


def main():
    parser = argparse.ArgumentParser(
        description="Run OCR on detected text bubbles in comic pages"
    )
    parser.add_argument(
        "--image",
        required=True,
        help="Path to the comic page image file"
    )
    parser.add_argument(
        "--bubbles",
        required=True,
        help="Path to the bubble detection JSON file"
    )
    parser.add_argument(
        "--output",
        help="Path for the output JSON file (default: {image_stem}-ocr.json)"
    )
    parser.add_argument(
        "--lang",
        default="chinese_cht",
        help="OCR language (default: chinese_cht)"
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=0.5,
        help="Minimum confidence to include text (default: 0.5)"
    )

    args = parser.parse_args()

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        image_path = Path(args.image)
        output_path = image_path.parent / f"{image_path.stem}-ocr.json"

    print("=" * 60)
    print("OCR Processing Tool")
    print("=" * 60)

    # Process the image
    try:
        result = process_image(
            args.image,
            args.bubbles,
            lang=args.lang,
            confidence_threshold=args.confidence_threshold
        )

        # Save output JSON
        print(f"\nSaving results to: {output_path}")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        # Print summary
        total_detections = len(result["detections"])
        with_text = sum(
            1 for d in result["detections"]
            if d["ocr_result"]["text_lines"]
        )

        print("\n" + "=" * 60)
        print(f"SUCCESS: Processed {total_detections} regions")
        print(f"  - {with_text} regions with detected text")
        print(f"  - {total_detections - with_text} regions with no text/errors")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
