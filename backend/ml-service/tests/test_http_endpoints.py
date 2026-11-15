"""
AapdaWatch AI — Live HTTP Endpoint Verification Suite for FastAPI Microservice
Tests all required endpoints against live running server on http://127.0.0.1:8001.
"""

import sys
import unittest
import httpx

BASE_URL = "http://127.0.0.1:8001"

class TestLiveFastApiEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_health_endpoint(self):
        """Test GET /health returns 200 with runtime readiness"""
        r = self.client.get("/health")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["backend"], "torch")
        self.assertEqual(data["runtime_readiness"], "READY")

    def test_02_model_info_endpoint(self):
        """Test GET /model/info returns verified model architecture and limitations"""
        r = self.client.get("/model/info")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["model_name"], "AapdaWatch_BiLSTM")
        self.assertEqual(data["framework"], "Keras 3")
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertEqual(data["vocabulary_size"], 13965)
        self.assertEqual(data["input_sequence_length"], 30)
        self.assertIn("DISASTER_RELATED", data["supported_labels"].values())
        self.assertIn("NOT_DISASTER_RELATED", data["supported_labels"].values())
        self.assertGreater(len(data["known_limitations"]), 0)

    def test_03_predict_disaster_text(self):
        """Test POST /predict with disaster signal returns DISASTER_RELATED and prob >= 0.35"""
        payload = {"text": "Flash flood warning! Bridge collapsed in river and multiple houses submerged!"}
        r = self.client.post("/predict", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["prediction"], "DISASTER_RELATED")
        self.assertGreaterEqual(data["probability"], 0.35)
        self.assertLessEqual(data["probability"], 1.0)
        self.assertFalse(data["is_synthetic"])
        self.assertEqual(data["analysis_mode"], "ML")
        self.assertEqual(data["model_name"], "AapdaWatch_BiLSTM")
        self.assertEqual(data["inference_status"], "SUCCESS")
        self.assertGreater(data["inference_duration_ms"], 0.0)

    def test_04_predict_non_disaster_text(self):
        """Test POST /predict with ordinary non-disaster text returns NOT_DISASTER_RELATED"""
        payload = {"text": "Having a relaxing cup of coffee and pastry with family at the central cafe!"}
        r = self.client.post("/predict", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["prediction"], "NOT_DISASTER_RELATED")
        self.assertLess(data["probability"], 0.35)
        self.assertGreaterEqual(data["probability"], 0.0)
        self.assertFalse(data["is_synthetic"])
        self.assertEqual(data["analysis_mode"], "ML")

    def test_05_empty_input_rejection(self):
        """Test POST /predict rejects empty string with 422"""
        r = self.client.post("/predict", json={"text": ""})
        self.assertEqual(r.status_code, 422)

    def test_06_whitespace_only_rejection(self):
        """Test POST /predict rejects whitespace-only string with 422"""
        r = self.client.post("/predict", json={"text": "   \n\t   "})
        self.assertEqual(r.status_code, 422)

    def test_07_invalid_request_body(self):
        """Test POST /predict rejects missing text key with 422"""
        r = self.client.post("/predict", json={"wrong_key": "some text"})
        self.assertEqual(r.status_code, 422)

    def test_08_batch_prediction_and_ordering(self):
        """Test POST /predict/batch correctly classifies multiple inputs preserving order"""
        batch_items = [
            {"text": "Sunny morning in Delhi today.", "request_id": "req-01"},
            {"text": "Severe cloudburst and landslide casualties reported in Kullu!", "request_id": "req-02"},
            {"text": "Just bought new sneakers from the mall.", "request_id": "req-03"},
        ]
        r = self.client.post("/predict/batch", json={"items": batch_items})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["total_items"], 3)
        self.assertEqual(len(data["predictions"]), 3)

        # Ordering check
        self.assertEqual(data["predictions"][0]["request_id"], "req-01")
        self.assertEqual(data["predictions"][1]["request_id"], "req-02")
        self.assertEqual(data["predictions"][2]["request_id"], "req-03")

        # Verify batch predictions match individual predictions
        for idx, item in enumerate(batch_items):
            single_res = self.client.post("/predict", json={"text": item["text"]}).json()
            batch_pred = data["predictions"][idx]
            self.assertEqual(batch_pred["prediction"], single_res["prediction"])
            self.assertAlmostEqual(batch_pred["probability"], single_res["probability"], places=4)

    def test_09_threshold_behavior(self):
        """Test probability strictly dictates predicted label according to 0.35 threshold"""
        r = self.client.post("/predict", json={"text": "Minor rainfall puddles on the sidewalk."})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        if data["probability"] >= 0.35:
            self.assertEqual(data["prediction"], "DISASTER_RELATED")
        else:
            self.assertEqual(data["prediction"], "NOT_DISASTER_RELATED")

    def test_10_probability_bounds_and_finite(self):
        """Test output probability is finite and within [0, 1]"""
        r = self.client.post("/predict", json={"text": "High storm alert."})
        self.assertEqual(r.status_code, 200)
        prob = r.json()["probability"]
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

    def test_11_no_synthetic_output_in_ml_mode(self):
        """Verify is_synthetic is strictly false and analysis_mode is ML"""
        r = self.client.post("/predict", json={"text": "Flood rescue operation underway."})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertFalse(data["is_synthetic"])
        self.assertEqual(data["analysis_mode"], "ML")

if __name__ == "__main__":
    unittest.main()
