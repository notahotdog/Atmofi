import React, { useState } from 'react';

type WeatherInsightsProps = {
  data: any; // Open-Meteo response or structured weather data
};

const tabTitles = ['Temperature', 'Precipitation','Wind'];

export const WeatherInsightsTabs: React.FC<WeatherInsightsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState(0);

  const renderContent = () => {
    if (!data) return <p>Loading data...</p>;

    const dates = data.time;
    switch (activeTab) {
      case 0:
        return data.temperature_2m_max.map((temp: number, idx: number) => (
          <p key={idx}><strong>{dates[idx]}</strong>: {temp}°C</p>
        ));
      case 1:
        return data.precipitation_sum.map((precip: number, idx: number) => (
          <p key={idx}><strong>{dates[idx]}</strong>: {precip} mm</p>
        ));
      case 2:
        return data.wind_speed_10m_max.map((wind: number, idx: number) => (
          <p key={idx}><strong>{dates[idx]}</strong>: {wind} km/h</p>
        ));
      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: '#2b2f3a', padding: '15px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        {tabTitles.map((title, idx) => (
          <button
            key={title}
            onClick={() => setActiveTab(idx)}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: activeTab === idx ? '#61dafb' : '#444',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {title}
          </button>
        ))}
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};
