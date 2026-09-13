# ==========================================================
# Unified Dockerfile: Node.js Backend + Python Geo Service
# (Context: backend/ directory)
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

# Install Python dependencies first
COPY geo_addressing/requirements.txt ./geo_addressing/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./geo_addressing/requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy backend source files
COPY . ./

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production
ENV PYTHON_PATH=/app/venv/bin/python

EXPOSE 5000

# Start Node.js server
CMD ["node", "server.js"]
