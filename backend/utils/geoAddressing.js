const getGeoAddress = async (lat, lng) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return null;
  }
  const serviceUrl = process.env.GEO_ADDRESSING_SERVICE_URL || 'http://127.0.0.1:8000';
  const apiKey = process.env.GEO_ADDRESSING_API_KEY || '';
  const url = `${serviceUrl}/encode?lat=${lat}&lon=${lng}`;
  const headers = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.warn(`Geo-addressing API returned status ${response.status}: ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      return data.address || null;
    } catch (err) {
      retries -= 1;
      if (retries === 0) {
        console.error('Failed to contact geo-addressing service after retries:', err.message);
        return null;
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const decodeGeoAddress = async (address) => {
  if (!address) return null;
  const serviceUrl = process.env.GEO_ADDRESSING_SERVICE_URL || 'http://127.0.0.1:8000';
  const apiKey = process.env.GEO_ADDRESSING_API_KEY || '';
  const url = `${serviceUrl}/decode?address=${encodeURIComponent(address)}`;
  const headers = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) return null;
      const data = await response.json();
      return data; // { lat, lon, state_code }
    } catch (err) {
      retries -= 1;
      if (retries === 0) return null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

module.exports = { getGeoAddress, decodeGeoAddress };
