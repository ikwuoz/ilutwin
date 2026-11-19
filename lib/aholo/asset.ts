import { createAssetClient, type UploadResult } from '@manycore/aholo-sdk-asset';
import { getAholoConfig } from './config';

/**
 * Uploads an in-memory media buffer (photo or video) to Aholo OUS storage
 * and returns a public URL usable by Lux3D and World APIs.
 */
export async function uploadMediaBuffer(
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  const client = createAssetClient(getAholoConfig());
  return client.uploadBuffer(buffer, {
    filename,
    customPrefix: 'ilutwin',
  });
}
