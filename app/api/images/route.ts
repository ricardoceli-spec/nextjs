import { NextRequest } from 'next/server';
import { getAllImages, createImage, uploadImage } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export async function GET() {
  try {
    const images = await getAllImages();
    return Response.json({ success: true, data: images });
  } catch (error) {
    console.error('Error fetching images:', error);
    return Response.json({ success: false, error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return Response.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    if (!title || title.trim() === '') {
      return Response.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return Response.json({ success: false, error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const id = uuidv4();
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${id}${ext}`;

    // Upload to blob storage (Vercel) or local disk
    // Upload to blob storage (Vercel) or local disk — returns the real URL
    const { url } = await uploadImage(file, filename);

    // Pass the real URL to createImage so it's stored in the record
    const image = await createImage({
      id,
      title: title.trim(),
      description: description?.trim() || null,
      filename,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      url,
    });

    return Response.json({ success: true, data: image }, { status: 201 });
  } catch (error) {
    console.error('Error creating image:', error);
    return Response.json({ success: false, error: 'Failed to create image' }, { status: 500 });
  }
}