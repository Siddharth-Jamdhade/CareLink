import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from app.services import llm_extractor as service


class ExtractionErrorsTest(unittest.TestCase):
    def test_missing_key_is_actionable(self):
        with patch.object(service, "client", None):
            result = service.extract_facts_from_image("unused.png", "")
        self.assertIn("GEMINI_API_KEY", result["_error"])
        self.assertEqual(result["_confidence"], 0)

    def test_provider_errors_are_safe(self):
        for code, expected in [(429, "quota"), (403, "permissions"), (404, "model"), (504, "temporarily unavailable")]:
            exc = Exception("secret provider payload")
            exc.code = code
            message = service.extraction_error(exc)
            self.assertIn(expected, message)
            self.assertNotIn("secret", message)

    def test_malformed_ai_objects_do_not_become_facts(self):
        with tempfile.TemporaryDirectory(dir="uploads") as folder:
            path = Path(folder) / "paper.png"
            path.write_bytes(b"synthetic")
            for text in ['[]', 'null', '{"gestational_week": "twenty"}', '{"pending_items": "test"}']:
                client = MagicMock()
                client.models.generate_content.return_value.text = text
                with patch.object(service, "client", client):
                    result = service.extract_facts_from_image(str(path), "")
                self.assertEqual(result["_confidence"], 0)
                self.assertIn("invalid response", result["_error"])

    def test_quota_is_not_retried_immediately(self):
        with tempfile.TemporaryDirectory(dir="uploads") as folder:
            path = Path(folder) / "paper.png"
            path.write_bytes(b"synthetic")
            client = MagicMock()
            error = Exception("provider payload")
            error.code = 429
            client.models.generate_content.side_effect = error
            with patch.object(service, "client", client):
                result = service.extract_facts_from_image(str(path), "")
            self.assertIn("quota", result["_error"])
            client.models.generate_content.assert_called_once()
