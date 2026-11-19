import { NextResponse } from 'next/server';
import { formatAholoError, uploadMediaBuffer } from '@/lib/aholo';
import type { UploadedMediaFile } from '@/types/aholo';

export const runtime = 'nodejs';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTS = new Set(['.mp4', '.mov']);
const INSV_EXTS = new Set(['.insv']);
const MAX_FILE_BYTES = 150 * 1024 * 1024; // 150 MB

function getMediaType(
  filename: string
): 'image' | 'video' | 'insv' | null {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return null;
  const ext = filename.slice(dotIdx).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (INSV_EXTS.has(ext)) return 'insv';
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entries = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((item): item is File => item instanceof File && item.size > 0);

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No media files provided. Attach "file" or "files" in form-data.' },
        { status: 400 }
      );
    }

    const uploaded: UploadedMediaFile[] = [];

    for (const file of entries) {
      const mediaType = getMediaType(file.name);
      if (!mediaType) {
        return NextResponse.json(
          {
            error: `Unsupported file format for "${file.name}". Supported: .jpg, .jpeg, .png, .webp, .mp4, .mov, .insv`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          {
            error: `"${file.name}" exceeds the 150 MB upload limit.`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await uploadMediaBuffer(buffer, file.name);

      uploaded.push({
        filename: file.name,
        url: result.url,
        md5: result.md5,
        uploadKey: result.uploadKey,
        obsTaskId: result.obsTaskId,
        mediaType,
        sizeBytes: file.size,
      });
    }

    return NextResponse.json({ files: uploaded }, { status: 200 });
  } catch (err) {
    const formatted = formatAholoError(err);
    return NextResponse.json(
      { error: formatted.error, code: formatted.code },
      { status: formatted.status }
    );
  }
}
