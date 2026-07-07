/* global process */
import { Redis } from '@upstash/redis';

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

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({
      success: false,
      error: '資料庫連線設定未完成。請確認您已在 Vercel 專案後台連結 KV 或 Upstash Redis 資料庫，並已進行 Redeploy 重新部署。'
    });
  }

  const redis = new Redis({ url, token });
  const { method } = req;

  try {
    // 1. GET Request - Retrieve all records
    if (method === 'GET') {
      const records = await redis.get('kuji_records');
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
      let records = (await redis.get('kuji_records')) || [];

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

        await redis.set('kuji_records', records);
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'Missing record ID for deletion' });
        }

        records = records.filter((r) => String(r.id) !== String(id));
        await redis.set('kuji_records', records);
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
