FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements_api.txt .
RUN pip install --no-cache-dir -r requirements_api.txt

# Copy only what the API needs (not training data, venv, etc.)
COPY api/       ./api/
COPY models/    ./models/
COPY artifacts/ ./artifacts/

EXPOSE 8000

# Render injects $PORT — fall back to 8000 locally
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
