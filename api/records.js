/* global process */
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

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

  // Detect available database environment variables
  const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const tcpUrl = process.env.REDIS_URL;

  let db = null;

  if (restUrl && restToken) {
    // Mode A: REST Client (Vercel KV / Upstash REST API)
    db = {
      get: async (key) => {
        const client = new UpstashRedis({ url: restUrl, token: restToken });
        return await client.get(key);
      },
      set: async (key, val) => {
        const client = new UpstashRedis({ url: restUrl, token: restToken });
        await client.set(key, val);
      }
    };
  } else if (tcpUrl) {
    // Mode B: TCP Client (Standard Redis via REDIS_URL)
    db = {
      get: async (key) => {
        const client = new Redis(tcpUrl);
        try {
          const val = await client.get(key);
          return val ? JSON.parse(val) : null;
        } finally {
          await client.quit();
        }
      },
      set: async (key, val) => {
        const client = new Redis(tcpUrl);
        try {
          await client.set(key, JSON.stringify(val));
        } finally {
          await client.quit();
        }
      }
    };
  }

  // If no connection parameters are present, throw a clear connection warning
  if (!db) {
    const envKeys = Object.keys(process.env).filter(key => 
      key.includes('KV') || key.includes('REDIS') || key.includes('UPSTASH') || key.includes('URL') || key.includes('TOKEN')
    );
    return res.status(500).json({
      success: false,
      error: '資料庫連線設定未完成。請確認您已在 Vercel 專案後台連結 KV 或 Upstash Redis 資料庫，並已進行 Redeploy 重新部署。',
      debugEnvKeys: envKeys
    });
  }

  const { method } = req;

  try {
    // 1. GET Request - Retrieve all records
    if (method === 'GET') {
      const records = await db.get('kuji_records');
      return res.status(200).json(records || []);
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
      let records = (await db.get('kuji_records')) || [];

      if (action === 'save') {
        const { record } = body;
        if (!record || !record.id) {
          return res.status(400).json({ success: false, error: 'Missing record or record ID' });
        }

        const index = records.findIndex((r) => String(r.id) === String(record.id));
        if (index > -1) {
          records[index] = record;
        } else {
          records.unshift(record); // Add to the top of the list
        }

        await db.set('kuji_records', records);
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'Missing record ID for deletion' });
        }

        records = records.filter((r) => String(r.id) !== String(id));
        await db.set('kuji_records', records);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Vercel KV Serverless API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
