FROM python:3.11-slim

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create persistent data directory
RUN mkdir -p /data/uploads

# Default environment variables (override in compose or runtime)
ENV DATABASE_URL=/data/vermillon.db
ENV UPLOAD_FOLDER=/data/uploads
ENV ADMIN_KEY=dev-key-change-in-production
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000

EXPOSE 5000

CMD ["python", "app.py"]
