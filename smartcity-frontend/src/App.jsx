import { useEffect, useState } from "react";
import "./App.css";

// Simple metric config with fallbacks
const METRIC_CONFIG = {
  temperature: { icon: "🌡️", unit: "°C" },
  humidity: { icon: "💧", unit: "%" },
  air_quality: { icon: "🌫️", unit: "AQI" },
  energy_consumption: { icon: "⚡", unit: "MW" },
  traffic_density: { icon: "🚦", unit: "%" },
  waste_level: { icon: "🗑️", unit: "%" },
  water_quality: { icon: "💦", unit: "PH" },
  noise_level: { icon: "🔊", unit: "dB" }
};

// Fallback config
const DEFAULT_CONFIG = { icon: "📊", unit: "", gradient: "#3498db" };

function App() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const fetchAllData = () => {
    fetch("http://localhost:3000/data/all")
      .then((res) => res.json())
      .then((json) => {
        console.log("Data received:", json);
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setIsLoading(false);
        
        // Mock data for testing if backend is down
        const mockData = {
          "smartcity:temperature:NewYork": "22.5",
          "smartcity:humidity:NewYork": "65",
          "smartcity:air_quality:NewYork": "45",
          "smartcity:temperature:London": "18.3",
          "smartcity:humidity:London": "72",
          "smartcity:traffic_density:London": "34",
          "smartcity:temperature:Tokyo": "25.7",
          "smartcity:humidity:Tokyo": "58",
          "smartcity:energy_consumption:Tokyo": "234",
        };
        setData(mockData);
      });
  };

  useEffect(() => {
    // Initial fetch
    fetchAllData();

    // Try SSE connection with error handling
    try {
      const eventSource = new EventSource("http://localhost:3000/data/live");
      
      eventSource.onmessage = (event) => {
        console.log("SSE update:", event.data);
        fetchAllData();
      };

      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.error("SSE connection failed:", error);
      // Fall back to polling
      const interval = setInterval(fetchAllData, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  // Group data by city with better error handling
  const cities = {};
  for (const key in data) {
    try {
      const parts = key.split(":");
      if (parts.length !== 3) continue;

      const metric = parts[1];
      const city = parts[2];

      if (!cities[city]) cities[city] = [];
      
      // Use config or fallback
      const config = METRIC_CONFIG[metric] || {
        ...DEFAULT_CONFIG,
        icon: "📊",
        unit: "",
      };
      
      cities[city].push({
        metric,
        value: data[key],
        config
      });
    } catch (error) {
      console.error("Error processing key:", key, error);
    }
  }

  // Format metric name
  const formatMetricName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get status color based on value
  const getStatusColor = (metric, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "#3498db";
    
    switch(metric) {
      case "temperature":
        return numValue > 30 ? "#e74c3c" : numValue > 20 ? "#e67e22" : "#3498db";
      case "humidity":
        return numValue > 80 ? "#3498db" : numValue > 50 ? "#2ecc71" : "#f1c40f";
      case "air_quality":
        return numValue > 150 ? "#e74c3c" : numValue > 100 ? "#e67e22" : "#2ecc71";
      default:
        return numValue > 50 ? "#e74c3c" : numValue > 30 ? "#e67e22" : "#2ecc71";
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading city intelligence...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🏙️</span>
          <h1>Smart City Dashboard</h1>
        </div>
        <div className="controls">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              🏢
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              📋
            </button>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            Live
          </div>
        </div>
      </header>

      <main className="main-content">
        {Object.keys(cities).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <h3>No Data Available</h3>
            <p>Waiting for data from backend. Check if server is running on port 3000.</p>
            <button onClick={fetchAllData} className="retry-btn">
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <div className="stats-bar">
              <div className="stat">
                <span className="stat-value">{Object.keys(cities).length}</span>
                <span className="stat-label">Cities</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {Object.values(cities).reduce((acc, metrics) => acc + metrics.length, 0)}
                </span>
                <span className="stat-label">Metrics</span>
              </div>
              <div className="stat">
                <span className="stat-value">Live</span>
                <span className="stat-label">Status</span>
              </div>
            </div>

            <div className={`city-grid ${viewMode}`}>
              {Object.entries(cities).map(([city, metrics]) => (
                <div className="city-card" key={city}>
                  <div className="city-header">
                    <h2>{city}</h2>
                    <span className="metric-count">{metrics.length} metrics</span>
                  </div>
                  
                  {viewMode === 'list' ? (
                    <div className="metrics-list">
                      {metrics.map((m, i) => (
                        <div className="metric-item" key={i}>
                          <div className="metric-icon-name">
                            <span className="metric-icon">{m.config.icon}</span>
                            <span className="metric-name">{formatMetricName(m.metric)}</span>
                          </div>
                          <span 
                            className="metric-value"
                            style={{ backgroundColor: getStatusColor(m.metric, m.value) }}
                          >
                            {m.value}{m.config.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="metrics-grid">
                      {metrics.map((m, i) => (
                        <div className="metric-card" key={i}>
                          <div className="metric-card-header">
                            <span className="metric-icon">{m.config.icon}</span>
                            <span className="metric-title">{formatMetricName(m.metric)}</span>
                          </div>
                          <div 
                            className="metric-card-value"
                            style={{ color: getStatusColor(m.metric, m.value) }}
                          >
                            {m.value}{m.config.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="city-footer">
                    <span className="update-time">
                      Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>Smart City Monitoring • Real-time Dashboard</p>
        <p className="footer-note">Data updates every 10 seconds</p>
      </footer>
    </div>
  );
}

export default App;