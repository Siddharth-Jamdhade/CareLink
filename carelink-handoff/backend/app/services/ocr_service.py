from paddleocr import PaddleOCR

# Initialize once
print("Loading OCR engine...")

ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang="en",
    show_log=False
)

print("OCR engine ready!")


def extract_text_from_image(image_path: str) -> str:
    """
    Takes an image file path.
    Returns all text found in the image as a single string.
    """

    result = ocr_engine.ocr(image_path, cls=True)

    lines = []

    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]

            if confidence > 0.5:
                lines.append(text)

    return "\n".join(lines)