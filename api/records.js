/* global process */
import { neon } from '@neondatabase/serverless';

let tableInitialized = false;

// DDL check helper to bootstrap the PostgreSQL table if it does not exist
async function ensureTable(sql) {
  if (tableInitialized) return;
  await sql(`
    CREATE TABLE IF NOT EXISTS kuji_records (
      id VARCHAR(255) PRIMARY KEY,
      date VARCHAR(255),
      location VARCHAR(255),
      cost INTEGER,
      value INTEGER,
      prizes JSONB
    );
  `);
  tableInitialized = true;
}

export default async function handler(req, res) {
  // Set CORS headers for local development and cross-origin access
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Detect database URL (injected automatically when Postgres/Neon is connected in Vercel Storage)
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!dbUrl) {
    const envKeys = Object.keys(process.env).filter(key => 
      key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('URL') || key.includes('TOKEN')
    );
    return res.status(500).json({
      success: false,
      error: '資料庫連線設定未完成。請確認您已在 Vercel 專案後台連結 Postgres (Neon) 資料庫，並已進行 Redeploy 重新部署。',
      debugEnvKeys: envKeys
    });
  }

  const sql = neon(dbUrl);
  const { method } = req;

  try {
    // Ensure database table exists before handling queries
    await ensureTable(sql);

    // 1. GET Request - Retrieve all records
    if (method === 'GET') {
      const rows = await sql('SELECT * FROM kuji_records ORDER BY date DESC, id DESC');
      
      const records = rows.map((r) => {
        let prizes = r.prizes;
        if (typeof prizes === 'string') {
          try {
            prizes = JSON.parse(prizes);
          } catch {
            prizes = [];
          }
        }
        return {
          id: String(r.id),
          date: r.date || '',
          location: r.location || '',
          cost: Number(r.cost) || 0,
          value: Number(r.value) || 0,
          prizes: prizes || []
        };
      });

      return res.status(200).json(records);
    }

    // 2. POST Request - Save or Delete
    if (method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ success: false, error: 'Malformed JSON body' });
        }
      }

      const { action } = body;

      if (action === 'save') {
        const { record } = body;
        if (!record || !record.id) {
          return res.status(400).json({ success: false, error: 'Missing record or record ID' });
        }

        const prizesJson = JSON.stringify(record.prizes || []);

        // Perform an UPSERT (insert or update on primary key conflict)
        await sql(`
          INSERT INTO kuji_records (id, date, location, cost, value, prizes)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id)
          DO UPDATE SET 
            date = EXCLUDED.date, 
            location = EXCLUDED.location, 
            cost = EXCLUDED.cost, 
            value = EXCLUDED.value, 
            prizes = EXCLUDED.prizes
        `, [
          String(record.id),
          String(record.date || ''),
          String(record.location || ''),
          Number(record.cost) || 0,
          Number(record.value) || 0,
          prizesJson
        ]);

        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'Missing ID for deletion' });
        }

        await sql('DELETE FROM kuji_records WHERE id = $1', [String(id)]);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Vercel Postgres (Neon) API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
