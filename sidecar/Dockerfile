FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY sidecar/ sidecar/

# Pre-download NLTK data so the container starts without network access
RUN python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4'); nltk.download('verbnet'); nltk.download('propbank'); nltk.download('framenet_v17')"

EXPOSE 8000

CMD ["uvicorn", "sidecar.main:app", "--host", "0.0.0.0", "--port", "8000"]
