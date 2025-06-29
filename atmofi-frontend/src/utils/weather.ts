//get the data for various temperature
export async function fetchHistoricTemps(lat: number, lon: number, start: string, end: string) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.search = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: start,
    end_date: end,
    daily: 'temperature_2m_max,temperature_2m_min',
  }).toString();

  const res = await fetch(url.toString());
  return res.json(); // has daily.time[], daily.temperature_2m_max[], etc.
}

// Generic fetch weather data function
export async function fetchHistoricalWeatherData(
  lat: number,
  lon: number,
  start: string,
  end: string,
  dailyParams: string = 'temperature_2m_max,temperature_2m_min'
) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.search = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: start,
    end_date: end,
    daily: dailyParams,
    timezone: 'auto'
  }).toString();

  const res = await fetch(url.toString());
  return res.json(); // includes .daily.{...}
}
