import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState({});

  const fetchAllData = () => {
    fetch("http://localhost:3000/data/all")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Fetch error:", err));
  };

  useEffect(() => {
    // Initial load
    fetchAllData();

    // Listen for backend updates
    const eventSource = new EventSource(
      "http://localhost:3000/data/live"
    );

    eventSource.onmessage = () => {
      // Any update → re-fetch all data
      fetchAllData();
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Group data by city
  const cities = {};
  for (const key in data) {
    const parts = key.split(":"); // smartcity:metric:city
    if (parts.length !== 3) continue;

    const metric = parts[1];
    const city = parts[2];

    if (!cities[city]) cities[city] = [];
    cities[city].push({
      metric,
      value: data[key],
    });
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌆 Smart City Dashboard</h1>

      {Object.keys(cities).length === 0 && (
        <p>No data available. Waiting for backend ingestion.</p>
      )}

      {Object.entries(cities).map(([city, metrics]) => (
        <div
          key={city}
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            marginTop: 15,
            padding: 15,
            background: "#f9f9f9",
          }}
        >
          <h2>{city.toUpperCase()}</h2>

          {metrics.map((m, i) => (
            <div key={i}>
              <strong>{m.metric}</strong>: {m.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;
