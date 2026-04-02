/**
 * API Route para generar signed URLs de Supabase Storage
 * Usa SERVICE_ROLE_KEY en servidor para acceso a buckets privados
 */

import { supabaseAdmin } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bucket, path, expiresIn = 3600 } = req.body;

    if (!bucket || !path) {
      return res.status(400).json({ 
        error: 'Missing required fields: bucket, path' 
      });
    }

    const supabase = supabaseAdmin();

    // Generar signed URL con duración específica
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(500).json({ 
        error: 'Failed to create signed URL', 
        details: error.message 
      });
    }

    return res.status(200).json({ 
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    });

  } catch (error) {
    console.error('Signed URL API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}