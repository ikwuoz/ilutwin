import { proxyAholoAsset } from '@/lib/proxy/aholoAssetProxy';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url')?.trim() ?? '';
  return proxyAholoAsset(rawUrl, 'application/octet-stream');
}
