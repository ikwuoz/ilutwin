import {
  AholoError,
  AuthenticationError,
  BusinessError,
  RateLimitError,
  type AholoClientConfig,
  type AholoRegion,
} from '@manycore/aholo-sdk-core';

const PLACEHOLDER_KEYS = new Set([
  '',
  'your_aholo_api_key_here',
  'your_lux3d_api_key_here',
  'your_lux3d_api_key',
  'your-api-key',
  'your_api_key',
]);

function resolveRegion(rawRegion?: string): AholoRegion {
  const normalized = rawRegion?.trim().toLowerCase() ?? 'com';
  return normalized === 'cn' || normalized === 'china' || normalized === 'domestic'
    ? 'cn'
    : 'com';
}

/**
 * Resolves server-side Aholo SDK configuration from environment variables.
 * Never expose AHOLO_API_KEY to client components.
 */
export function getAholoConfig(): AholoClientConfig {
  const apiKey = process.env.AHOLO_API_KEY?.trim() ?? '';
  if (PLACEHOLDER_KEYS.has(apiKey)) {
    throw new Error(
      'AHOLO_API_KEY is not configured. Copy .env.local.example to .env.local and add your Aholo API key.'
    );
  }

  return {
    apiKey,
    region: resolveRegion(process.env.AHOLO_REGION),
    userAgent: 'ilutwin-lagos-hackathon/0.1.0',
  };
}

/**
 * Resolves server-side Lux3D SDK configuration, preferring LUX3D_API_KEY /
 * LUX3D_REGION and falling back to AHOLO_API_KEY / AHOLO_REGION.
 */
export function getLux3dConfig(): AholoClientConfig {
  const luxKey = process.env.LUX3D_API_KEY?.trim() ?? '';
  const aholoKey = process.env.AHOLO_API_KEY?.trim() ?? '';
  const apiKey = !PLACEHOLDER_KEYS.has(luxKey) ? luxKey : aholoKey;

  if (PLACEHOLDER_KEYS.has(apiKey)) {
    throw new Error(
      'LUX3D_API_KEY (or AHOLO_API_KEY) is not configured. Copy .env.local.example to .env.local and add your API key.'
    );
  }

  const rawRegion = process.env.LUX3D_REGION?.trim() || process.env.AHOLO_REGION;
  return {
    apiKey,
    region: resolveRegion(rawRegion),
    userAgent: 'ilutwin-lagos-hackathon/0.1.0',
  };
}

export function isAholoConfigured(): boolean {
  const apiKey = process.env.AHOLO_API_KEY?.trim() ?? '';
  return !PLACEHOLDER_KEYS.has(apiKey);
}

export interface FormattedApiError {
  status: number;
  error: string;
  code?: string;
}

export function formatAholoError(err: unknown): FormattedApiError {
  if (err instanceof AuthenticationError) {
    return {
      status: 401,
      code: 'AHOLO_AUTH_ERROR',
      error:
        'Aholo authentication failed. Check AHOLO_API_KEY and AHOLO_REGION in .env.local.',
    };
  }
  if (err instanceof RateLimitError) {
    return {
      status: 429,
      code: 'AHOLO_RATE_LIMIT',
      error: 'Aholo API rate limit reached. Please wait a moment and retry.',
    };
  }
  if (err instanceof BusinessError) {
    return {
      status: 400,
      code: 'AHOLO_BUSINESS_ERROR',
      error: err.message || 'Aholo rejected the request parameters.',
    };
  }
  if (err instanceof AholoError) {
    return {
      status: 502,
      code: 'AHOLO_API_ERROR',
      error: err.message || 'Upstream Aholo API request failed.',
    };
  }
  if (err instanceof Error) {
    const isMissingKey = err.message.includes('AHOLO_API_KEY');
    return {
      status: isMissingKey ? 503 : 500,
      code: isMissingKey ? 'MISSING_API_KEY' : 'INTERNAL_ERROR',
      error: err.message,
    };
  }
  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    error: 'An unexpected error occurred.',
  };
}
