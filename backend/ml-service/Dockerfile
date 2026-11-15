FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and model artifacts
COPY . .

# Set environment variables for production inference
ENV PYTHONUNBUFFERED=1 \
    KERAS_BACKEND=torch \
    KERAS_HOME=/app/artifacts \
    PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "server.py"]

