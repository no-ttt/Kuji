/* global process */
import { neon } from '@neondatabase/serverless';

let tableInitialized = false;

// DDL check helper to bootstrap the PostgreSQL table if it does not exist
async function ensureTable(sql) {
  if (tableInitialized) return;
  
  // Neon requires SQL queries to be called as a tagged template: sql`QUERY`
  await sql`
    CREATE TABLE IF NOT EXISTS kuji_records (
      id VARCHAR(255) PRIMARY KEY,
      date VARCHAR(255),
      location VARCHAR(255),
      cost INTEGER,
      value INTEGER,
      prizes JSONB
    );
  `;
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
      // Fetch records using template literal
      const rows = await sql`SELECT * FROM kuji_records ORDER BY date DESC, id DESC`;
      
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

      if (action === 'import_defaults') {
        const recordsToImport = [
          {
            id: '1783230165652',
            date: '2026-07-05',
            location: '逢甲商圈《我的英雄學院》－交織的思念',
            cost: 1100,
            value: 1250,
            prizes: [{"name":"E賞","value":900},{"name":"G賞","value":350},{"name":"炮灰","value":0}]
          },
          {
            id: '1783230771924',
            date: '2026-07-05',
            location: '北車地下街 13Y出口《正義使者》我的英雄學院之非法英雄',
            cost: 2240,
            value: 5000,
            prizes: [{"name":"B賞","value":1000},{"name":"LastOne","value":4000},{"name":"炮灰","value":0},{"name":"炮灰","value":0},{"name":"炮灰","value":0},{"name":"炮灰","value":0},{"name":"炮灰","value":0}]
          }
        ];

        for (const record of recordsToImport) {
          const prizesJson = JSON.stringify(record.prizes);
          await sql`
            INSERT INTO kuji_records (id, date, location, cost, value, prizes)
            VALUES (${record.id}, ${record.date}, ${record.location}, ${record.cost}, ${record.value}, ${prizesJson})
            ON CONFLICT (id) DO UPDATE SET
              date = EXCLUDED.date,
              location = EXCLUDED.location,
              cost = EXCLUDED.cost,
              value = EXCLUDED.value,
              prizes = EXCLUDED.prizes;
          `;
        }
        return res.status(200).json({ success: true, message: 'Imported successfully' });
      }

      if (action === 'save') {
        const { record } = body;
        if (!record || !record.id) {
          return res.status(400).json({ success: false, error: 'Missing record or record ID' });
        }

        const prizesJson = JSON.stringify(record.prizes || []);

        const recordId = String(record.id);
        const recordDate = String(record.date || '');
        const recordLocation = String(record.location || '');
        const recordCost = Number(record.cost) || 0;
        const recordValue = Number(record.value) || 0;

        // Perform an UPSERT using tagged-template variables.
        // Neon automatically serializes and parameterizes these variables safely.
        await sql`
          INSERT INTO kuji_records (id, date, location, cost, value, prizes)
          VALUES (${recordId}, ${recordDate}, ${recordLocation}, ${recordCost}, ${recordValue}, ${prizesJson})
          ON CONFLICT (id)
          DO UPDATE SET 
            date = EXCLUDED.date, 
            location = EXCLUDED.location, 
            cost = EXCLUDED.cost, 
            value = EXCLUDED.value, 
            prizes = EXCLUDED.prizes;
        `;

        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'Missing ID for deletion' });
        }

        const recordId = String(id);
        await sql`DELETE FROM kuji_records WHERE id = ${recordId}`;
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
