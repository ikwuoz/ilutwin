import { buildHealthResponse } from '@/lib/health';

export const runtime = 'nodejs';

export async function GET() {
  return buildHealthResponse();
}
