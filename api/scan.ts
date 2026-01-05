import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { keyword, location } = req.body || {};

  if (!keyword || !location) {
    return res.status(400).json({ error: 'Missing keyword or location' });
  }

  // 🔒 PLACEHOLDER — LIVE DATA WILL PLUG HERE
  return res.status(200).json({
    keyword,
    location,
    competitors: [
      { name: 'Competitor A', rating: 4.5 },
      { name: 'Competitor B', rating: 3.9 }
    ],
    opportunityScore: 92,
    message: 'Live scan endpoint active'
  });
}
