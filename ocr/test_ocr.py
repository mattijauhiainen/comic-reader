from paddleocr import PaddleOCR

# Initialize PaddleOCR for Traditional Chinese
ocr = PaddleOCR(
    lang="chinese_cht",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

# Path to your segmented comic bubble image
image_path = "/Users/matti/Desktop/test.png"

# Run OCR
result = ocr.predict(image_path)

# Print recognized text and confidence for each line
for i, text in enumerate(result[0]["rec_texts"]):
    confidence = result[0]["rec_scores"][i]
    print(f"Text: {text}, Confidence: {confidence:.4f}")
