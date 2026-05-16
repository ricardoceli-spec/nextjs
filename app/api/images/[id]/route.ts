import { NextRequest } from 'next/server';
import { getImageById, updateImage, removeImage, deleteImageFile, uploadImage } from '@/lib/db';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await getImageById(id);
    if (!image) {
      return Response.json({ success: false, error: 'Image not found' }, { status: 404 });
    }
    return Response.json({ success: true, data: image });
  } catch (error) {
    console.error('Error fetching image:', error);
    return Response.json({ success: false, error: 'Failed to fetch image' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getImageById(id);
    if (!existing) {
      return Response.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    let title: string | null = null;
    let description: string | null | undefined = undefined;
    let newFilename: string | null = null;
    let newMimeType: string | null = null;
    let newSize: number | null = null;
    let newUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file replacement
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      title = formData.get('title') as string | null;
      description = formData.get('description') as string | null;

      if (title !== null && title.trim() === '') {
        return Response.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      }

      if (file) {
        // Validate new file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
          return Response.json({ success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' }, { status: 400 });
        }

        // Validate new file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return Response.json({ success: false, error: 'File size exceeds 10MB limit' }, { status: 400 });
        }

        // Delete old file
        await deleteImageFile(existing.filename);

        // Save new file
        const ext = path.extname(file.name) || '.jpg';
        newFilename = `${id}${ext}`;
        const { url } = await uploadImage(file, newFilename);
        newUrl = url;
        newMimeType = file.type;
        newSize = file.size;
      }
    } else {
      // Handle JSON update (title/description only)
      const body = await request.json();
      title = body.title ?? null;
      description = body.description !== undefined ? body.description : undefined;

      if (title !== null && title.trim() === '') {
        return Response.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      }
    }

    // Update DB with new data
    const updateData: Record<string, string | number | null> = {};
    if (title !== null) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (newFilename) updateData.filename = newFilename;
    if (newMimeType) updateData.mime_type = newMimeType;
    if (newSize !== null) updateData.size = newSize;
    if (newUrl) updateData.url = newUrl;

    const updated = await updateImage(id, updateData);

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating image:', error);
    return Response.json({ success: false, error: 'Failed to update image' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getImageById(id);
    if (!existing) {
      return Response.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    // Delete the file from blob/disk
    await deleteImageFile(existing.filename);

    const deleted = await removeImage(id);
    if (!deleted) {
      return Response.json({ success: false, error: 'Failed to delete image' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return Response.json({ success: false, error: 'Failed to delete image' }, { status: 500 });
  }
}