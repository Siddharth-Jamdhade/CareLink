from threading import Lock

# Do not load heavyweight OCR models for sign-in, profiles or read-only records.
ocr_engine = None
_lock = Lock()


def get_engine():
    global ocr_engine
    with _lock:
        if ocr_engine is None:
            from paddleocr import PaddleOCR
            ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return ocr_engine


def extract_text_from_image(image_path: str) -> str:
    """
    Takes an image file path.
    Returns all text found in the image as a single string.
    """

    with _lock:
        engine = ocr_engine
    if engine is None:
        engine = get_engine()
    with _lock:
        result = engine.ocr(image_path, cls=True)

    lines = []

    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]

            if confidence > 0.5:
                lines.append(text)

    return "\n".join(lines)
