# 🗺️ Orb Frontend

The frontend interface for the Orb platform, built with **React**, **Vite**, and **MapLibre GL JS**. This client handles high-performance map rendering, real-time WebSocket state management, and an interactive social UI.

## 🌟 Capabilities

- **Fluid Map Interactions:** Double-click to drop custom stamp markers, right-click/D-pad to nudge precise 3x3m grid locations.
- **Dynamic Layers:** Toggle between satellite, street, live traffic, and railway/transit layers on the fly.
- **Real-time Engine:** Instantaneous UI updates when friends move, using a highly optimized React rendering loop to prevent map stutter.
- **Responsive Navigation:** Contextual drawers, multi-tiered bottom navigation, and a floating action button (FAB) architecture for mobile-first usability.
- **Routing & Simulation:** Request directions and watch a simulated navigation vehicle traverse the calculated route.

## 🛠️ Tech Stack
- **React 18**
- **Vite** (for blazing fast HMR and optimized builds)
- **MapLibre GL JS** (Open-source mapping)
- **Lucide React** (Consistent iconography)
- **Axios** (API requests)
- **Socket.io-client** (Live location sync)

## 📦 Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root of the `frontend` directory and add your API keys:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_TOMTOM_API_KEY=your_key_here
   VITE_LOCATIONIQ_API_KEY=your_key_here
   VITE_OLA_MAPS_API_KEY=your_key_here
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```
   The optimized production files will be output to the `dist` directory.
