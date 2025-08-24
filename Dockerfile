FROM python:3.10-slim

WORKDIR /app

# Install system dependencies that may be needed for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Create downloads directory structure
RUN mkdir -p downloads

# Expose port (Fly.io uses 8080)
EXPOSE 8080

# Start command
CMD ["python", "backend/main.py"]