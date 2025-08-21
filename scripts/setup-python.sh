#!/bin/bash

# Setup script for Python backend

echo "Setting up Python environment for InstaScrape..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create downloads directory
echo "Creating downloads directory..."
mkdir -p downloads

# Create .env file for Python backend if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env file..."
    cat > backend/.env << EOL
# Python backend environment variables
BACKEND_PORT=8000
DOWNLOADS_PATH=../downloads
EOL
fi

echo "Python backend setup complete!"
echo ""
echo "To start the Python backend:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Start the backend: python backend/main.py"
echo ""
echo "The backend will be available at http://localhost:8000"