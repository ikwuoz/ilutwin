import { NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIXES = [
  '.aholo.ai',
  '.aholo.cn',
  '.kujiale.com',
  '.myqcloud.com',
  '.aliyuncs.com',
  '.amazonaws.com',
  '.cloudfront.net',
];

export function isAllowedAholoAssetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.')
    ) {
      return null;
    }

    const matchesKnownHost = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix)
    );
    if (!matchesKnownHost) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Proxies allowlisted HTTPS Aholo/COS/Kujiale 3D assets (.glb, .spz, .ply, .splat)
 * over same-origin to avoid browser CORS errors in WebGL loaders.
 */
export async function proxyAholoAsset(
  rawUrl: string,
  defaultContentType: string
) {
  const targetUrl = isAllowedAholoAssetUrl(rawUrl);

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Invalid or disallowed asset URL.' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Failed to fetch upstream asset (${upstream.status}).` },
        { status: 502 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') || defaultContentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Network error while proxying 3D asset.' },
      { status: 502 }
    );
  }
}
