"""
AapdaWatch AI — FastAPI Microservice Pydantic Schemas
Defines request and response schemas for BiLSTM inference endpoints.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator

class PredictionRequest(BaseModel):
    text: str = Field(..., description="Raw text of the disaster or civilian report to classify")
    request_id: Optional[str] = Field(None, description="Optional client-provided correlation ID")

    @field_validator("text")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Input text must not be empty or whitespace-only.")
        if len(v.strip()) > 5000:
            raise ValueError("Input text exceeds maximum allowed length of 5000 characters.")
        return v

class BatchPredictionRequest(BaseModel):
    items: List[PredictionRequest] = Field(..., min_length=1, max_length=100, description="List of report items to classify")

class PredictionResponse(BaseModel):
    prediction: str = Field(..., description="'DISASTER_RELATED' or 'NOT_DISASTER_RELATED'")
    probability: float = Field(..., description="Sigmoid model score in range [0.0, 1.0]")
    confidence: float = Field(..., description="Classification confidence [0.0, 1.0]")
    decision_threshold: float = Field(0.35, description="Decision threshold applied")
    model_name: str = Field("AapdaWatch_BiLSTM", description="Neural architecture identity")
    model_version: str = Field("1.0.0", description="Model version")
    inference_status: str = Field("SUCCESS", description="'SUCCESS' or 'FAILED'")
    analysis_mode: str = Field("ML", description="'ML' for neural BiLSTM, never 'DEMO'")
    is_synthetic: bool = Field(False, description="Strictly false for real neural inference")
    preprocessing_version: str = Field("candidate-v1", description="Normalization pipeline version")
    preprocessing_parity: str = Field("UNVERIFIED", description="Provenance status of preprocessing")
    inference_duration_ms: float = Field(..., description="CPU compute latency in milliseconds")
    sequence_length: int = Field(..., description="Count of tokenized words before padding")
    tokens: List[int] = Field(default_factory=list, description="Truncated integer token IDs")
    request_id: Optional[str] = None

class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    total_items: int
    batch_duration_ms: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    backend: str
    runtime_readiness: str

class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    framework: str
    framework_version: str
    backend: str
    backend_version: str
    input_sequence_length: int
    vocabulary_size: int
    decision_threshold: float
    supported_labels: Dict[str, str]
    preprocessing_version: str
    preprocessing_parity: str
    padding_direction: str
    padding_parity: str
    readiness: str
    known_limitations: List[str]

