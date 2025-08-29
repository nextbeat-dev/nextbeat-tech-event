import { createTool } from '@mastra/core';
import { z } from 'zod';

// Open-Meteo API (完全無料、APIキー不要)を使用
const BASE_URL = 'https://api.open-meteo.com/v1';

export const weatherApiTool = createTool({
  id: 'fetch-weather',
  description: 'Fetch real-time weather information for a specified city using Open-Meteo API (no API key required)',
  inputSchema: z.object({
    city: z.string().describe('City name to get weather information for'),
  }),
  outputSchema: z.object({
    city: z.string(),
    temperature: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
    wind_speed: z.number(),
    weather_main: z.string(),
    weather_description: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { city } = context;
    
    console.log('=== weatherApiTool実行開始 ===');
    console.log('受信した都市名:', city);
    console.log('contextの内容:', context);
    
    try {
      // まず都市の座標を取得（Open-Meteo Geocoding API）
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja&format=json`;
      
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
        throw new Error(`Geocoding error: ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json();
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`City not found: ${city}`);
      }
      
      const location = geoData.results[0];
      const { latitude, longitude, name } = location;
      
      // 天気データを取得
      const weatherUrl = `${BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=Asia/Tokyo&forecast_days=1`;
      
      const weatherResponse = await fetch(weatherUrl);
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }
      
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      
      // Weather codeから天気状況を判定
      const weatherInfo = getWeatherInfo(current.weather_code);
      
      const result = {
        city: name,
        temperature: Math.round(current.temperature_2m),
        feels_like: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m * 3.6), // km/h to m/s変換
        weather_main: weatherInfo.main,
        weather_description: weatherInfo.description,
        success: true,
      };
      
      console.log('=== weatherApiTool成功 ===');
      console.log('返却データ:', result);
      
      return result;
      
    } catch (error) {
      console.error('Weather API error:', error);
      console.error('Error details:', error.stack);
      console.error('Typeof fetch:', typeof fetch);
      
      // APIエラーの場合はフォールバックデータを返す
      const fallbackData = getFallbackWeatherData(city, `API Error: ${error.message}`);
      console.log('=== weatherApiTool失敗、フォールバックデータ返却 ===');
      console.log('フォールバックデータ:', fallbackData);
      return fallbackData;
    }
  },
});

// Weather codeから天気情報を取得
function getWeatherInfo(weatherCode: number) {
  // Open-Meteo Weather Code定義に基づく
  const codes = {
    0: { main: 'Clear', description: '快晴' },
    1: { main: 'Clear', description: '晴れ' },
    2: { main: 'Partly Cloudy', description: '一部曇り' },
    3: { main: 'Overcast', description: '曇り' },
    45: { main: 'Fog', description: '霧' },
    48: { main: 'Fog', description: '霜霧' },
    51: { main: 'Drizzle', description: '小雨' },
    53: { main: 'Drizzle', description: '霧雨' },
    55: { main: 'Drizzle', description: '強い霧雨' },
    61: { main: 'Rain', description: '小雨' },
    63: { main: 'Rain', description: '雨' },
    65: { main: 'Rain', description: '大雨' },
    80: { main: 'Rain', description: 'にわか雨' },
    81: { main: 'Rain', description: '強いにわか雨' },
    82: { main: 'Rain', description: '激しいにわか雨' },
    95: { main: 'Thunderstorm', description: '雷雨' },
    96: { main: 'Thunderstorm', description: '雹を伴う雷雨' },
    99: { main: 'Thunderstorm', description: '激しい雹を伴う雷雨' },
  };
  
  return codes[weatherCode] || { main: 'Unknown', description: '不明' };
}

// フォールバックデータ（APIが使えない場合）
function getFallbackWeatherData(city: string, error?: string) {
  const cityLower = city.toLowerCase();
  
  // 2025年8月下旬の現実的な天気データ
  const weatherData = {
    '東京': { temp: 33, feels: 38, humidity: 75, wind: 8, main: 'Clear', desc: '猛暑・晴れ' },
    'tokyo': { temp: 33, feels: 38, humidity: 75, wind: 8, main: 'Clear', desc: '猛暑・晴れ' },
    '大阪': { temp: 35, feels: 40, humidity: 80, wind: 4, main: 'Partly Cloudy', desc: '猛暑・薄曇り' },
    'osaka': { temp: 35, feels: 40, humidity: 80, wind: 4, main: 'Partly Cloudy', desc: '猛暑・薄曇り' },
    '札幌': { temp: 28, feels: 31, humidity: 60, wind: 14, main: 'Clear', desc: '晴れ' },
    'sapporo': { temp: 28, feels: 31, humidity: 60, wind: 14, main: 'Clear', desc: '晴れ' },
  };
  
  const data = weatherData[cityLower] || weatherData[city] || {
    temp: 30, feels: 33, humidity: 70, wind: 11, main: 'Clear', desc: '晴れ'
  };
  
  return {
    city,
    temperature: data.temp,
    feels_like: data.feels,
    humidity: data.humidity,
    wind_speed: data.wind,
    weather_main: data.main,
    weather_description: data.desc,
    success: !error,
    error: error || 'Using demo data (Open-Meteo API is not available)',
  };
}