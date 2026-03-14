/**
 * /api/geocode.js
 * Converts a place name (e.g. "Abington, Pennsylvania") to lat/lon + UTC offset.
 * Uses the free OpenStreetMap Nominatim API — no key required.
 *
 * GET /api/geocode?place=Chicago%2C+Illinois
 * Returns: { lat, lon, displayName }
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { place } = req.query;
  if (!place) {
    return res.status(400).json({ error: 'Missing place parameter' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=5`;
    const response = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent identifying your app
        'User-Agent': 'AstroApp/1.0 (contact@youremail.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.length) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Return top 5 results so the user can pick the right one
    const results = data.map(item => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }));

    return res.status(200).json({ results });

  } catch (err) {
    console.error('Geocode error:', err);
    return res.status(500).json({ error: 'Geocoding failed', detail: err.message });
  }
}
