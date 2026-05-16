import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export interface ImageRecord {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  updated_at: string;
  url: string;
}

const isVercel = !!process.env.VERCEL;
const DATA_BLOB_PATH = 'data/images.json';

// ──────────────────────────────────────────────
// Persistence: JSON file in Vercel Blob (Vercel) or local file system (dev)
// ──────────────────────────────────────────────

async function readData(): Promise<ImageRecord[]> {
  if (isVercel) {
    try {
      const prefix = process.env.NEXT_PUBLIC_BLOB_URL_PREFIX;
      if (!prefix) return [];
      const res = await fetch(`${prefix}/${DATA_BLOB_PATH}`, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  } else {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'images.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

async function writeData(images: ImageRecord[]): Promise<void> {
  const json = JSON.stringify(images, null, 2);
  if (isVercel) {
    await put(DATA_BLOB_PATH, json, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } else {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'images.json'), json, 'utf-8');
  }
}

// ──────────────────────────────────────────────
// Image upload helpers
// ──────────────────────────────────────────────

const UPLOADS_FOLDER = 'uploads';

export async function uploadImage(file: File, filename: string): Promise<{ url: string }> {
  if (isVercel) {
    const blob = await put(`${UPLOADS_FOLDER}/${filename}`, Buffer.from(await file.arrayBuffer()), {
      access: 'public',
      addRandomSuffix: false,
    });
    return { url: blob.url };
  } else {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return { url: `/uploads/${filename}` };
  }
}

export async function deleteImageFile(filename: string): Promise<void> {
  if (isVercel) {
    try { await del(`${UPLOADS_FOLDER}/${filename}`); } catch { /* ignore */ }
  } else {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────

function getImageUrl(filename: string): string {
  if (isVercel) {
    const base = process.env.NEXT_PUBLIC_BLOB_URL_PREFIX || '';
    return `${base}/${UPLOADS_FOLDER}/${filename}`;
  }
  return `/uploads/${filename}`;
}

// ──────────────────────────────────────────────
// Database operations (CRUD on JSON)
// ──────────────────────────────────────────────

export async function getAllImages(): Promise<ImageRecord[]> {
  return readData();
}

export async function getImageById(id: string): Promise<ImageRecord | null> {
  const images = await readData();
  return images.find(img => img.id === id) || null;
}

export async function createImage(data: {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
}): Promise<ImageRecord> {
  const images = await readData();
  const now = new Date().toISOString();
  const record: ImageRecord = {
    id: data.id,
    title: data.title,
    description: data.description,
    filename: data.filename,
    original_name: data.original_name,
    mime_type: data.mime_type,
    size: data.size,
    url: getImageUrl(data.filename),
    created_at: now,
    updated_at: now,
  };
  images.unshift(record);
  await writeData(images);
  return record;
}

export async function updateImage(id: string, updates: Record<string, string | number | null>): Promise<ImageRecord | null> {
  const images = await readData();
  const index = images.findIndex(img => img.id === id);
  if (index === -1) return null;

  const allowedFields: (keyof ImageRecord)[] = ['title', 'description', 'filename', 'original_name', 'mime_type', 'size', 'url'];
  const record = { ...images[index] };
  let changed = false;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key as any) && value !== undefined) {
      (record as any)[key] = value;
      changed = true;
    }
  }

  if (!changed) return record;

  record.updated_at = new Date().toISOString();
  images[index] = record;
  await writeData(images);
  return record;
}

export async function removeImage(id: string): Promise<boolean> {
  const images = await readData();
  const index = images.findIndex(img => img.id === id);
  if (index === -1) return false;
  images.splice(index, 1);
  await writeData(images);
  return true;
}