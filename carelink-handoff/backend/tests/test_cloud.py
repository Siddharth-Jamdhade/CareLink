import unittest
from unittest.mock import patch
from cloud_start import public_origin
from tests import test_mobile as mobile_tests


class CloudOriginTest(unittest.TestCase):
    def test_requires_https_origin(self):
        self.assertEqual(public_origin('https://care.example/'), 'https://care.example')
        for bad in ('http://care.example', '', 'https://care.example/path', 'https://user:pass@care.example', 'https://care.example?x=1'):
            with self.subTest(value=bad), self.assertRaises(ValueError):
                public_origin(bad)


class CloudNfcTest(unittest.TestCase):
    setUp = mobile_tests.MobileIntegrationTest.setUp
    tearDown = mobile_tests.MobileIntegrationTest.tearDown
    login = mobile_tests.MobileIntegrationTest.login

    def test_nfc_link_is_cloud_url_with_access_controls(self):
        with patch.dict('os.environ', {'CARELINK_CLOUD_MODE': '1', 'FRONTEND_URL': 'https://synthetic.example'}):
            self.login()
            self.assertEqual(self.client.get('/api/patients/one/nfc-link').status_code, 403)
            self.login('staff')
            link = self.client.get('/api/patients/one/nfc-link')
            self.assertEqual(link.status_code, 200)
            self.assertEqual(link.json()['url'], 'https://synthetic.example/patient/one')
            self.assertTrue(link.json()['requires_sign_in'])
            self.assertFalse(link.json()['local_esp32_available'])
            self.assertEqual(self.client.get('/api/patients/two/nfc-link').status_code, 403)
            self.client.post('/api/auth/logout')
            self.assertEqual(self.client.get('/api/patients/one/journey').status_code, 401)
