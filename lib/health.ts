import { NextResponse } from 'next/server';
import { isAholoConfigured } from '@/lib/aholo';

export function buildHealthResponse() {
  return NextResponse.json(
    {
      ok: true,
      status: 'healthy',
      aholoConfigured: isAholoConfigured(),
      region: process.env.AHOLO_REGION?.trim() || 'com',
    },
    { status: 200 }
  );
}
