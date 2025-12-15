import argparse
import json
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForObjectDetection

MODEL_ID = "ogkalu/comic-text-and-bubble-detector"

# Label mappings from the model
LABELS = {
    0: "bubble",
    1: "text_bubble",
    2: "text_free",
}

# Colors for visualization (BGR format for OpenCV)
COLORS = {
    0: (255, 0, 255),  # Magenta for bubbles
    1: (0, 255, 0),  # Green for text in bubbles
    2: (0, 165, 255),  # Orange for free text
}


def detect_regions(image_path: str, threshold: float = 0.3):
    """
    Detect text and bubble regions in a comic page image.

    Args:
        image_path: Path to the image file
        threshold: Confidence threshold for detections

    Returns:
        dict with 'detections' list and 'image_info'
    """
    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForObjectDetection.from_pretrained(MODEL_ID)

    image = Image.open(image_path).convert("RGB")
    width, height = image.size

    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)

    # Postprocess to get boxes in image coordinates
    results = processor.post_process_object_detection(
        outputs,
        threshold=threshold,
        target_sizes=[(height, width)],
    )[0]

    detections = []
    for score, label, box in zip(
        results["scores"], results["labels"], results["boxes"]
    ):
        score_val = float(score)
        label_id = int(label)
        x1, y1, x2, y2 = [float(coord) for coord in box.tolist()]

        detections.append(
            {
                "label": LABELS.get(label_id, f"unknown_{label_id}"),
                "label_id": label_id,
                "confidence": round(score_val, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            }
        )

    return {
        "image_info": {
            "path": str(image_path),
            "width": width,
            "height": height,
        },
        "detections": detections,
        "model": MODEL_ID,
        "threshold": threshold,
    }


def save_results_json(results: dict, output_path: str):
    """Save detection results to JSON file."""
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved JSON results to: {output_path}")


def visualize_results(image_path: str, results: dict, output_path: str):
    """
    Draw bounding boxes on the image and save the annotated version.

    Args:
        image_path: Path to the original image
        results: Detection results dict
        output_path: Path to save the annotated image
    """
    # Load image with OpenCV
    img = cv2.imread(image_path)
    if img is None:
        # Try loading with PIL and converting
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # Draw each detection
    for det in results["detections"]:
        label_id = det["label_id"]
        label = det["label"]
        confidence = det["confidence"]
        bbox = det["bbox"]

        x1, y1, x2, y2 = map(int, [bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]])

        # Get color for this label
        color = COLORS.get(label_id, (255, 255, 255))

        # Draw rectangle
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        # Draw label with confidence
        text = f"{label}: {confidence:.2f}"
        font_scale = 0.5
        thickness = 1

        # Get text size for background
        (text_width, text_height), baseline = cv2.getTextSize(
            text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness
        )

        # Draw background rectangle for text
        cv2.rectangle(
            img,
            (x1, y1 - text_height - baseline - 5),
            (x1 + text_width, y1),
            color,
            -1,
        )

        # Draw text
        cv2.putText(
            img,
            text,
            (x1, y1 - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (0, 0, 0),
            thickness,
        )

    # Save annotated image
    cv2.imwrite(output_path, img)
    print(f"Saved annotated image to: {output_path}")


def save_cropped_regions(image_path: str, results: dict, output_dir: str):
    """
    Save cropped images of each detected region.

    Args:
        image_path: Path to the original image
        results: Detection results dict
        output_dir: Directory to save cropped images
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    img = cv2.imread(image_path)
    if img is None:
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    h, w = img.shape[:2]

    for idx, det in enumerate(results["detections"]):
        label_id = det["label_id"]
        confidence = det["confidence"]
        bbox = det["bbox"]

        x1, y1, x2, y2 = map(int, [bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]])

        # Clamp to image bounds
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        crop = img[y1:y2, x1:x2]
        crop_path = output_dir / f"det_{label_id}_{confidence:.2f}_{idx}.png"
        cv2.imwrite(str(crop_path), crop)

    print(f"Saved {len(results['detections'])} cropped regions to: {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Detect text and bubbles in comic pages"
    )
    parser.add_argument(
        "image_path",
        nargs="?",
        default="../reader/pizarro/page2.avif",
        help="Path to the comic page image",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.3,
        help="Confidence threshold for detections (default: 0.3)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=".",
        help="Output directory for results (default: current directory)",
    )
    parser.add_argument(
        "--save-crops",
        action="store_true",
        help="Save cropped images of detected regions",
    )
    parser.add_argument(
        "--no-visualize",
        action="store_true",
        help="Skip creating the annotated visualization",
    )

    args = parser.parse_args()

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get base name for output files
    image_path = Path(args.image_path)
    base_name = image_path.stem

    print(f"Processing: {args.image_path}")
    print(f"Threshold: {args.threshold}")

    # Detect regions
    results = detect_regions(args.image_path, threshold=args.threshold)
    print(f"Found {len(results['detections'])} detections")

    # Save JSON
    json_path = output_dir / f"{base_name}-bubbles.json"
    save_results_json(results, str(json_path))

    # Visualize (unless disabled)
    if not args.no_visualize:
        annotated_path = output_dir / f"{base_name}-annotated.png"
        visualize_results(args.image_path, results, str(annotated_path))

    # Save crops (if requested)
    if args.save_crops:
        crops_dir = output_dir / f"{base_name}-crops"
        save_cropped_regions(args.image_path, results, str(crops_dir))


if __name__ == "__main__":
    main()
