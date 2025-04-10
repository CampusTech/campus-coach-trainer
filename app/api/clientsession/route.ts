import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/app/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await auth();
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
}