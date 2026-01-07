import { useEffect, useState, useMemo, useCallback, memo } from "react";
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

// Memoized Metric Item Component
const MetricItem = memo(({ metric, value, config, viewMode }) => {
  const formatMetricName = useCallback((name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const getStatusColor = useCallback((metric, value) => {
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
  }, []);

  const formattedName = useMemo(() => formatMetricName(metric), [metric, formatMetricName]);
  const statusColor = useMemo(() => getStatusColor(metric, value), [metric, value, getStatusColor]);

  if (viewMode === 'list') {
    return (
      <div className="metric-item">
        <div className="metric-icon-name">
          <span className="metric-icon">{config.icon}</span>
          <span className="metric-name">{formattedName}</span>
        </div>
        <span 
          className="metric-value"
          style={{ backgroundColor: statusColor }}
        >
          {value}{config.unit}
        </span>
      </div>
    );
  }
  
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-icon">{config.icon}</span>
        <span className="metric-title">{formattedName}</span>
      </div>
      <div 
        className="metric-card-value"
        style={{ color: statusColor }}
      >
        {value}{config.unit}
      </div>
    </div>
  );
});

MetricItem.displayName = 'MetricItem';

// Memoized City Card Component
const CityCard = memo(({ city, metrics, viewMode }) => {
  return (
    <div className="city-card">
      <div className="city-header">
        <h2>{city}</h2>
        <span className="metric-count">{metrics.length} metrics</span>
      </div>
      
      {viewMode === 'list' ? (
        <div className="metrics-list">
          {metrics.map((m, i) => (
            <MetricItem
              key={`${city}-${m.metric}-${i}`}
              metric={m.metric}
              value={m.value}
              config={m.config}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="metrics-grid">
          {metrics.map((m, i) => (
            <MetricItem
              key={`${city}-${m.metric}-${i}`}
              metric={m.metric}
              value={m.value}
              config={m.config}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
      
      <div className="city-footer">
        <span className="update-time">
          Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
});

CityCard.displayName = 'CityCard';

function App() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const fetchAllData = useCallback(() => {
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
  }, []);

  // Debounced data fetching
  const debouncedFetchAllData = useCallback(() => {
    const timeoutId = setTimeout(fetchAllData, 1000);
    return () => clearTimeout(timeoutId);
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();

    const eventSource = new EventSource("http://localhost:3000/data/live");

    eventSource.addEventListener("update", (event) => {
      console.log("SSE update received:", event.data);
      // Use debounced version to prevent too frequent updates
      debouncedFetchAllData();
    });

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [fetchAllData, debouncedFetchAllData]);

  // Group data by city with better error handling
  const cities = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return {};
    }
    
    const cityMap = {};
    for (const key in data) {
      try {
        const parts = key.split(":");
        if (parts.length !== 3) continue;

        const metric = parts[1];
        const city = parts[2];

        if (!cityMap[city]) cityMap[city] = [];
        
        const config = METRIC_CONFIG[metric] || {
          ...DEFAULT_CONFIG,
          icon: "📊",
          unit: "",
        };
        
        cityMap[city].push({
          metric,
          value: data[key],
          config
        });
      } catch (error) {
        console.error("Error processing key:", key, error);
      }
    }
    return cityMap;
  }, [data]);

  // Memoized event handlers
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const handleRetryConnection = useCallback(() => {
    setIsLoading(true);
    fetchAllData();
  }, [fetchAllData]);

  // Memoized stats calculations
  const stats = useMemo(() => {
    const cityCount = Object.keys(cities).length;
    const metricCount = Object.values(cities).reduce((acc, metrics) => acc + metrics.length, 0);
    
    return { cityCount, metricCount };
  }, [cities]);

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
              onClick={() => handleViewModeChange('grid')}
              title="Grid View"
            >
              🏢
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
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
            <button onClick={handleRetryConnection} className="retry-btn">
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <div className="stats-bar">
              <div className="stat">
                <span className="stat-value">{stats.cityCount}</span>
                <span className="stat-label">Cities</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {stats.metricCount}
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
                <CityCard
                  key={city}
                  city={city}
                  metrics={metrics}
                  viewMode={viewMode}
                />
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

export default memo(App);