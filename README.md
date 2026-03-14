# 🌍 Climate Time Machine

> **"See the past, understand the present, predict the future."**

Climate Time Machine is an interactive, AI-powered dashboard that visualizes decades of climate data for any city in the world. Built for climate awareness and education, it allows users to search for a location, travel through time (1990–2050), and see how temperature, rainfall, CO₂ levels, and climate risks evolve over time.

This project was built during a Hackathon to demonstrate the power of integrating natural language AI with real-time geographical and environmental data visualizations.

---

## ✨ Features

- **📍 Dynamic Global Search:** Look up any city in the world using the Open-Meteo Geocoding API.
- **🗺️ Interactive Map:** Smooth fly-to animations using Leaflet.js.
- **⏳ Time Travel Slider:** Scrub between 1990 and 2050. Watch the data, charts, and risk scores update dynamically based on the selected era (Historical, Current, or Projected).
- **📊 Real Climate Trends:** Beautiful, responsive Recharts visualizing temperature shifts, rainfall patterns, and CO₂ emissions.
- **🧠 Natural Language AI Search:** Powered by **Gemini 2.0 Flash**. Ask freeform questions like *"What is the climate risk for Mumbai in 2050?"* and let the AI extract the intent, update the dashboard state, and generate a concise climate impact summary.
- **⚠️ Dynamic Risk Dial:** A dynamic SVG speedometer that calculates composite climate risk based on location data and selected year.

---

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS (Glassmorphism UI)
- Open-Meteo API (Geocoding)
- Leaflet / React-Leaflet (Maps)
- Recharts (Data Visualization)

**Backend:**
- Node.js / Express
- Google Gemini API (`gemini-2.5-flash` / `gemini-2.0-flash` auto-discovery)

---

## 🚀 Quick Setup (Under 3 Minutes)

The repository is structured to be simple to run. You will need two terminal windows (one for the frontend, one for the backend).

### Prerequisites
- Node.js (v18+ recommended)
- A free Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Backend Setup

```bash
# Navigate to the backend folder
cd backend

# Install dependencies
npm install

# Set up environment variables
# 1. Create a file named .env inside the backend folder
# 2. Add your Gemini API key:
echo "GEMINI_API_KEY=your_actual_key_here" > .env

# Start the Express server (Runs on http://localhost:5000)
npm start
```

### 2. Frontend Setup

Open a **new terminal window**:

```bash
# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### 3. Open the App
Go to **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 💬 Example AI Queries to Try

Once the app is running, paste these exact queries into the **AI Climate Search** bar at the top of the dashboard:

> *"Show climate stats for Jaipur in 2040"*

> *"What is the climate risk for Mumbai in 2050?"*

> *"How has rainfall changed in Delhi?"*

> *"Temperature trend for Bengaluru since 1990"*

Watch as the AI extracts your intent, automatically zooms the map to the city, adjusts the time-travel slider to the correct year, and renders a tailored climate summary!

---

## 🏆 Hackathon Context

**Challenge:** Build an interactive, data-driven application that solves a real-world problem.
**Solution:** Climate Time Machine makes the abstract threat of climate change highly localized and visually tangible. By allowing users to see exactly what will happen to *their* city in 2050, it bridges the gap between scientific data and public awareness. Integrating Gemini makes the complex data instantly accessible to anyone without needing to navigate complex UI menus.
