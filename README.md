<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  <h1>🌍 Orb (Orbit)</h1>
  <p><strong>A Next-Generation Real-Time Location Sharing & Mapping Platform</strong></p>
</div>

---

### What is Orb?
Orb is a highly interactive, full-stack mapping and location-sharing platform built with React, Vite, and MapLibre. It empowers users to explore the world by viewing real-time traffic, navigating transit routes, dropping custom location stamps, and tracking friends live on the map. The platform is powered by an advanced backend architecture, utilizing Python for precise geo-addressing and Node.js with Firebase for seamless, real-time multiplayer updates.

## ✨ Key Features
- **🗺️ Interactive Mapping:** Custom map layers including satellite, street, real-time traffic, and global transit networks.
- **📍 Real-Time Location Sharing:** Seamlessly share your location with friends and groups via WebSocket connections.
- **🛡️ Privacy First:** Configurable visibility modes including "Ghost Mode", temporary 2-hour pins, and district-level blurring.
- **🏷️ Custom Geo-Addressing:** A dedicated Python microservice that converts complex coordinate geometries into readable, unique 3x3m grid addresses.
- **👥 Social Ecosystem:** Send friend requests, create groups, drop public "Stamps" (persistent map markers), and react to places.
- **📹 In-App Communication:** Built-in Agora signaling for 1:1 and group video calls.

## 🏗️ Architecture & Tech Stack

This repository is built as a monorepo containing three core services:

### 1. Frontend (`/frontend`)
- **Framework:** React 18 + Vite
- **Mapping Engine:** MapLibre GL JS
- **Styling:** Custom CSS, Lucide React Icons
- **State Management:** React Hooks + Context

### 2. Primary Backend (`/backend`)
- **Server:** Node.js + Express
- **Real-Time:** Socket.io
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Phone/OTP)
- **Communications:** Agora.io SDK

### 3. Geo-Addressing Service (`/backend/geo_addressing` or standalone)
- **Server:** Python + FastAPI / Uvicorn
- **Purpose:** Mathematical coordinate conversion, reverse geocoding, and routing logic.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Firebase Project with Firestore & Auth enabled
- Map API keys (TomTom for traffic, etc.)

### 1. Setup Backend
```bash
cd backend
npm install
# Create a .env file with your Firebase credentials
npm run dev
```

### 2. Setup Python Microservice
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn geo_addressing.api:app --reload --port 8000
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Security & Hardening
Security is taken seriously in Orb. We implement strict rate-limiting, coordinate fuzzing for idle users, HTTPS enforcement, and database-level security rules. Please see `SECURITY_HARDENING.md` for detailed information on our anti-scraping and data protection measures.

---
*Created with ❤️ by the Orb Development Team*
