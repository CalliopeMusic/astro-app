/**
 * /api/chart.js
 * Calculates a full natal chart from birth date, time, and coordinates.
 * Uses the swisseph npm package (Swiss Ephemeris bindings for Node.js).
 *
 * POST body:
 * {
 *   year: 1995, month: 5, day: 22,
 *   hour: 20, minute: 47,
 *   lat: 40.1151, lon: -75.1165,   // Abington, PA
 *   timezone: -4                    // UTC offset at birth (EDT = -4)
 * }
 *
 * Returns: { planets, houses, aspects, ascendant, mc }
 */

import swisseph from 'swisseph';

// Planet IDs in Swiss Ephemeris
const PLANETS = [
  { id: swisseph.SE_SUN,     name: 'Sun',     symbol: '☉' },
  { id: swisseph.SE_MOON,    name: 'Moon',    symbol: '☽' },
  { id: swisseph.SE_MERCURY, name: 'Mercury', symbol: '☿' },
  { id: swisseph.SE_VENUS,   name: 'Venus',   symbol: '♀' },
  { id: swisseph.SE_MARS,    name: 'Mars',    symbol: '♂' },
  { id: swisseph.SE_JUPITER, name: 'Jupiter', symbol: '♃' },
  { id: swisseph.SE_SATURN,  name: 'Saturn',  symbol: '♄' },
  { id: swisseph.SE_URANUS,  name: 'Uranus',  symbol: '♅' },
  { id: swisseph.SE_NEPTUNE, name: 'Neptune', symbol: '♆' },
  { id: swisseph.SE_PLUTO,   name: 'Pluto',   symbol: '♇' },
  { id: swisseph.SE_MEAN_NODE, name: 'N.Node', symbol: '☊' },
  { id: swisseph.SE_CHIRON,  name: 'Chiron',  symbol: '⚷' },
];

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

const HOUSE_NAMES = [
  'Self & Identity', 'Money & Values', 'Communication & Mind',
  'Home & Roots', 'Creativity & Romance', 'Health & Daily Life',
  'Partnerships', 'Transformation & Shared Resources', 'Philosophy & Travel',
  'Career & Public Life', 'Friends & Community', 'Inner Life & Unconscious'
];

const ASPECT_DEFS = [
  { name: 'Conjunction', angle: 0,   orb: 8,  type: 'neutral', symbol: '☌' },
  { name: 'Sextile',     angle: 60,  orb: 5,  type: 'easy',    symbol: '⚹' },
  { name: 'Square',      angle: 90,  orb: 7,  type: 'hard',    symbol: '□' },
  { name: 'Trine',       angle: 120, orb: 7,  type: 'easy',    symbol: '△' },
  { name: 'Opposition',  angle: 180, orb: 8,  type: 'hard',    symbol: '☍' },
  { name: 'Quincunx',   angle: 150, orb: 3,  type: 'neutral', symbol: '⚻' },
];

function lonToSign(lon) {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const deg = Math.floor(norm % 30);
  const minFloat = (norm % 30 - deg) * 60;
  const min = Math.floor(minFloat);
  return {
    lon: norm,
    sign: SIGNS[signIndex],
    signIndex,
    deg,
    min,
    displayDeg: `${deg}°${String(min).padStart(2,'0')}'`
  };
}

function getAspects(planets, houseCusps) {
  const points = [
    ...planets,
    { name: 'ASC', lon: houseCusps[0], symbol: '↑' },
    { name: 'MC',  lon: houseCusps[9], symbol: '⊕' },
  ];

  const aspects = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let diff = Math.abs(points[i].lon - points[j].lon) % 360;
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: points[i].name,
            symbol1: points[i].symbol,
            planet2: points[j].name,
            symbol2: points[j].symbol,
            aspect: asp.name,
            aspectSymbol: asp.symbol,
            type: asp.type,
            orb: Math.round(orb * 100) / 100,
          });
        }
      }
    }
  }
  return aspects;
}

function getHouseNumber(lon, cusps) {
  const l = ((lon % 360) + 360) % 360;
  for (let i = 0; i < 12; i++) {
    const start = ((cusps[i] % 360) + 360) % 360;
    const end   = ((cusps[(i + 1) % 12] % 360) + 360) % 360;
    if (start <= end) {
      if (l >= start && l < end) return i + 1;
    } else {
      if (l >= start || l < end) return i + 1;
    }
  }
  return 1;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month, day, hour, minute, lat, lon, timezone } = req.body;

    if (!year || !month || !day || lat == null || lon == null || timezone == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert local birth time to UTC
    const utcHour = (hour || 0) - timezone;
    const utcMinute = minute || 0;

    // Calculate Julian Day Number (UTC)
    const jd = swisseph.swe_julday(
      year, month, day,
      utcHour + utcMinute / 60,
      swisseph.SE_GREG_CAL
    );

    // Calculate planet positions
    const planets = [];
    for (const planet of PLANETS) {
      const result = swisseph.swe_calc_ut(jd, planet.id, swisseph.SEFLG_SWIEPH);
      if (result.flag === swisseph.ERR) continue;

      const isRetrograde = result.data[3] < 0; // negative speed = retrograde
      const pos = lonToSign(result.data[0]);

      planets.push({
        name: planet.name,
        symbol: planet.symbol,
        lon: pos.lon,
        sign: pos.sign,
        signIndex: pos.signIndex,
        deg: pos.deg,
        min: pos.min,
        displayDeg: pos.displayDeg + (isRetrograde ? ' R' : ''),
        retrograde: isRetrograde,
      });
    }

    // Calculate houses using Placidus system
    const housesResult = swisseph.swe_houses(jd, lat, lon, 'P');
    const cusps = housesResult.house; // array of 12 house cusp longitudes

    const houses = cusps.map((cusp, i) => {
      const pos = lonToSign(cusp);
      return {
        number: i + 1,
        cusp: pos.lon,
        sign: pos.sign,
        signIndex: pos.signIndex,
        deg: pos.deg,
        min: pos.min,
        displayDeg: pos.displayDeg,
        theme: HOUSE_NAMES[i],
      };
    });

    // Add house number to each planet
    planets.forEach(p => {
      p.house = getHouseNumber(p.lon, cusps);
    });

    // ASC and MC
    const ascPos = lonToSign(housesResult.ascendant);
    const mcPos  = lonToSign(housesResult.mc);

    const ascendant = {
      lon: ascPos.lon,
      sign: ascPos.sign,
      signIndex: ascPos.signIndex,
      deg: ascPos.deg,
      min: ascPos.min,
      displayDeg: ascPos.displayDeg,
    };

    const mc = {
      lon: mcPos.lon,
      sign: mcPos.sign,
      signIndex: mcPos.signIndex,
      deg: mcPos.deg,
      min: mcPos.min,
      displayDeg: mcPos.displayDeg,
    };

    // Calculate aspects
    const aspects = getAspects(planets, cusps);

    return res.status(200).json({
      planets,
      houses,
      aspects,
      ascendant,
      mc,
      meta: {
        jd,
        lat,
        lon,
        utcHour: utcHour + utcMinute / 60,
      }
    });

  } catch (err) {
    console.error('Chart calculation error:', err);
    return res.status(500).json({ error: 'Chart calculation failed', detail: err.message });
  }
}
