# ==========================================================
# Unified Dockerfile: Node.js Backend + Python Geo Service
# ==========================================================
FROM node:20-bookworm-slim

# Install Python 3, venv, and system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup isolated Python virtual environment
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies first (leveraging Docker layer cache)
COPY backend/geo_addressing/requirements.txt ./geo_addressing/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./geo_addressing/requirements.txt

# Install Node dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy backend application source
COPY backend/ ./

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production
ENV PYTHON_PATH=/app/venv/bin/python

# Cloud platforms (Render, Railway, Fly) inject dynamic PORT
EXPOSE 5000

# Start Node.js server (which automatically spawns and manages Python FastAPI)
CMD ["node", "server.js"]
