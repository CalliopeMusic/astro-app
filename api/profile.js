/**
 * /api/profile.js
 * Saves and retrieves a user's birth data and cached chart.
 * Uses Supabase as the database.
 *
 * GET  /api/profile?userId=xxx        → returns saved profile
 * POST /api/profile                   → saves/updates profile
 *
 * Supabase table schema (run this SQL in your Supabase dashboard):
 *
 * create table profiles (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id text unique not null,
 *   name text,
 *   birth_date date,
 *   birth_time time,
 *   birth_place text,
 *   lat float,
 *   lon float,
 *   timezone float,
 *   chart jsonb,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export default async function handler(req, res) {

  // GET — fetch profile
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No row found — new user
        return res.status(404).json({ error: 'Profile not found' });
      }
      if (error) throw error;

      return res.status(200).json({ profile: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — save/update profile
  if (req.method === 'POST') {
    const { userId, name, birthDate, birthTime, birthPlace, lat, lon, timezone, chart } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id:     userId,
          name:        name,
          birth_date:  birthDate,
          birth_time:  birthTime,
          birth_place: birthPlace,
          lat:         lat,
          lon:         lon,
          timezone:    timezone,
          chart:       chart,
          updated_at:  new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ profile: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
