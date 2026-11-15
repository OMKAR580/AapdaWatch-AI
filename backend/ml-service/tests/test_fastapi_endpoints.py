"""
AapdaWatch AI — FastAPI Microservice Endpoint Verification Suite
Tests all required endpoints, validations, batch processing, and failure states.
"""

import sys
import os
import unittest

# Add ml-service root to sys.path
SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVICE_ROOT not in sys.path:
    sys.path.insert(0, SERVICE_ROOT)

from fastapi.testclient import TestClient
from app.main import app

class TestFastApiMicroservice(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # TestClient invokes lifespan context on enter
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_01_health_endpoint_ready(self):
        """Test GET /health returns 200 and healthy status when model is loaded"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["backend"], "torch")
        self.assertEqual(data["runtime_readiness"], "READY")

    def test_02_model_info_endpoint(self):
        """Test GET /model/info returns verified model architecture and limitations"""
        response = self.client.get("/model/info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["model_name"], "AapdaWatch_BiLSTM")
        self.assertEqual(data["framework"], "Keras 3")
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertEqual(data["vocabulary_size"], 13965)
        self.assertIn("DISASTER_RELATED", data["supported_labels"].values())
        self.assertIn("NOT_DISASTER_RELATED", data["supported_labels"].values())
        self.assertGreater(len(data["known_limitations"]), 0)

    def test_03_valid_single_prediction_disaster(self):
        """Test POST /predict with disaster-related report"""
        payload = {"text": "Flash flood warning! Bridge collapsed in river and multiple houses submerged!"}
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["prediction"], "DISASTER_RELATED")
        self.assertGreaterEqual(data["probability"], 0.35)
        self.assertLessEqual(data["probability"], 1.0)
        self.assertFalse(data["is_synthetic"])
        self.assertEqual(data["analysis_mode"], "ML")
        self.assertEqual(data["model_name"], "AapdaWatch_BiLSTM")
        self.assertEqual(data["inference_status"], "SUCCESS")
        self.assertGreater(data["inference_duration_ms"], 0.0)

    def test_04_valid_single_prediction_non_disaster(self):
        """Test POST /predict with ordinary civilian non-disaster text"""
        payload = {"text": "Having a relaxing cup of coffee and pastry with family at the central cafe!"}
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["prediction"], "NOT_DISASTER_RELATED")
        self.assertLess(data["probability"], 0.35)
        self.assertGreaterEqual(data["probability"], 0.0)
        self.assertFalse(data["is_synthetic"])
        self.assertEqual(data["analysis_mode"], "ML")

    def test_05_empty_input_rejection(self):
        """Test POST /predict rejects empty string with 400 or 422"""
        payload = {"text": ""}
        response = self.client.post("/predict", json=payload)
        self.assertIn(response.status_code, [400, 422])
        self.assertIn("empty", response.text.lower())

    def test_06_whitespace_only_rejection(self):
        """Test POST /predict rejects whitespace-only string with 400 or 422"""
        payload = {"text": "   \n\t   "}
        response = self.client.post("/predict", json=payload)
        self.assertIn(response.status_code, [400, 422])
        self.assertIn("whitespace", response.text.lower())

    def test_07_invalid_request_body(self):
        """Test POST /predict rejects missing text key with 422 Unprocessable Entity"""
        payload = {"invalid_key": "some text"}
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_08_batch_prediction_and_ordering(self):
        """Test POST /predict/batch correctly classifies multiple inputs preserving order"""
        batch_items = [
            {"text": "Enjoying hot coffee and pancakes with family.", "request_id": "req-01"},
            {"text": "Severe cloudburst and landslide casualties reported in Kullu!", "request_id": "req-02"},
            {"text": "Just bought new sneakers from the mall.", "request_id": "req-03"},
        ]
        response = self.client.post("/predict/batch", json={"items": batch_items})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_items"], 3)
        self.assertEqual(len(data["predictions"]), 3)

        # Ordering check
        self.assertEqual(data["predictions"][0]["request_id"], "req-01")
        self.assertEqual(data["predictions"][1]["request_id"], "req-02")
        self.assertEqual(data["predictions"][2]["request_id"], "req-03")

        # Class predictions
        self.assertEqual(data["predictions"][0]["prediction"], "NOT_DISASTER_RELATED")
        self.assertEqual(data["predictions"][1]["prediction"], "DISASTER_RELATED")
        self.assertEqual(data["predictions"][2]["prediction"], "NOT_DISASTER_RELATED")

    def test_09_threshold_behavior(self):
        """Test threshold parameter strictly separates DISASTER_RELATED vs NOT_DISASTER_RELATED"""
        payload = {"text": "Minor rainfall puddles on the sidewalk."}
        response = self.client.post("/predict", json=payload)
        data = response.json()
        prob = data["probability"]
        if prob >= 0.35:
            self.assertEqual(data["prediction"], "DISASTER_RELATED")
        else:
            self.assertEqual(data["prediction"], "NOT_DISASTER_RELATED")

    def test_10_model_unavailable_behavior(self):
        """Test endpoints return 503 when app.state.model_ready is False"""
        original_state = app.state.model_ready
        try:
            app.state.model_ready = False

            # Health returns 503
            h_res = self.client.get("/health")
            self.assertEqual(h_res.status_code, 503)

            # Predict returns 503
            p_res = self.client.post("/predict", json={"text": "Flood alert."})
            self.assertEqual(p_res.status_code, 503)

            # Model info returns 503
            m_res = self.client.get("/model/info")
            self.assertEqual(m_res.status_code, 503)
        finally:
            app.state.model_ready = original_state

if __name__ == "__main__":
    unittest.main()

