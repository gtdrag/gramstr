#!/bin/bash

# Kill any existing processes on our ports
lsof -ti:3000 | xargs kill 2>/dev/null
lsof -ti:8000 | xargs kill 2>/dev/null

# Start Python backend
source venv/bin/activate
cd backend && python main.py &
cd ..

# Start Next.js
npm run dev