# ⚙️ Orb Backend Services

The backend architecture for Orb consists of a primary **Node.js/Express** server for social interactions and a **Python/FastAPI** microservice for intense geo-spatial computations.

## 🏗️ Architecture

### 1. Node.js API & WebSocket Server
- **REST API:** Handles User Registration, Authentication (Firebase Phone Auth), Friend Requests, Groups, and Stamps.
- **Socket.io Engine:** Manages the real-time rooms. When a user moves, the socket broadcasts their new coordinates only to users in their mutually accepted friend list or active groups.
- **Database:** Firebase Firestore (NoSQL).
- **Security:** Rate limiting middleware, request sanitization, and 24-hour location ghosting cron jobs.

### 2. Python Geo-Addressing Microservice (`/geo_addressing`)
- **FastAPI / Uvicorn:** A high-speed asynchronous server.
- **Mathematical Encoding:** Converts raw GPS coordinates (Latitude/Longitude) into highly readable, unique 3x3m grid addresses (e.g., `WB/eastport6/absurdly0`).
- **Routing:** Handles complex A* or Dijkstra route resolving if needed for navigation.

## 🚀 Setup Instructions

### Node.js Server
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Configure Environment Variables:
   - Copy `.env.example` to `.env`
   - Add your Firebase Service Account JSON string and Agora keys.
4. Start the server: `npm run dev` (Runs on port 5000)

### Python Microservice
1. Ensure Python 3.10+ is installed.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install dependencies: `pip install -r requirements.txt` (or install FastAPI/Uvicorn manually)
4. Start the service: `python -m uvicorn geo_addressing.api:app --reload --port 8000`

## 🛡️ Data Privacy
All real-time location data is ephemeral. The Node-Cron jobs run periodically to wipe "Ghost Pins" and 24-hour historical location data from Firestore, ensuring users cannot be tracked long-term unless they explicitly create a public "Stamp".
