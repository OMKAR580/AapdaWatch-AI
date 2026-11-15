import os
import sys

# Configure Keras backend & home directory before imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.environ["KERAS_BACKEND"] = "torch"
os.environ["KERAS_HOME"] = os.path.join(BASE_DIR, "artifacts")

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="info")

