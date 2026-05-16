'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import ImageCard, { ImageData } from '@/components/ImageCard';
import Modal from '@/components/Modal';
import UploadForm from '@/components/UploadForm';
import Toast, { ToastMessage } from '@/components/Toast';

type ModalType = 'upload' | 'edit' | 'view' | 'delete' | null;

export default function Home() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editDragOver, setEditDragOver] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // Toast helpers
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = String(++toastIdRef.current);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch images
  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/images');
      const data = await res.json();
      if (data.success) {
        setImages(data.data);
      } else {
        addToast('Failed to load images', 'error');
      }
    } catch {
      addToast('Network error while loading images', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Filter images by title (client-side)
  const filteredImages = images.filter((img) =>
    img.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Modal handlers
  const openModal = (type: ModalType, image?: ImageData) => {
    setSelectedImage(image || null);
    if (type === 'edit' && image) {
      setEditTitle(image.title);
      setEditDescription(image.description || '');
      setEditFile(null);
      setEditPreview(null);
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedImage(null);
    setEditFile(null);
    setEditPreview(null);
  };

  // Upload success
  const handleUploadSuccess = () => {
    addToast('Image uploaded successfully', 'success');
    fetchImages();
  };

  // Edit file handlers
  const handleEditFileSelect = useCallback((selectedFile: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(selectedFile.type)) {
      addToast('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.', 'error');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      addToast('File size exceeds 10MB limit.', 'error');
      return;
    }
    setEditFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setEditPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }, [addToast]);

  const handleEditDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleEditFileSelect(droppedFile);
  }, [handleEditFileSelect]);

  const handleEditDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditDragOver(true);
  };

  const handleEditDragLeave = () => setEditDragOver(false);

  const handleEditFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleEditFileSelect(selectedFile);
  };

  // Edit image
  const handleEdit = async () => {
    if (!selectedImage || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      let res;
      if (editFile) {
        const formData = new FormData();
        formData.append('image', editFile);
        formData.append('title', editTitle.trim());
        formData.append('description', editDescription.trim());
        res = await fetch(`/api/images/${selectedImage.id}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch(`/api/images/${selectedImage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null }),
        });
      }
      const data = await res.json();
      if (data.success) {
        addToast('Image updated successfully', 'success');
        fetchImages();
        closeModal();
      } else {
        addToast(data.error || 'Failed to update image', 'error');
      }
    } catch {
      addToast('Network error while updating image', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete image
  const handleDelete = async () => {
    if (!selectedImage) return;
    try {
      const res = await fetch(`/api/images/${selectedImage.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Image deleted successfully', 'success');
        fetchImages();
        closeModal();
      } else {
        addToast(data.error || 'Failed to delete image', 'error');
      }
    } catch {
      addToast('Network error while deleting image', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Toast container */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Gallery</h1>
                <p className="text-xs text-gray-500 leading-tight">Image Gallery App</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search box */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title..."
                  className="w-48 lg:w-56 pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <button
                onClick={() => openModal('upload')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Image
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-square bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-3/4" />
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-1/2" />
                  <div className="flex justify-between pt-1">
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-16" />
                    <div className="flex gap-1">
                      <div className="h-7 w-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded-lg" />
                      <div className="h-7 w-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredImages.length === 0 && searchQuery ? (
          /* No search results */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No results found</h2>
            <p className="text-gray-500 mb-2 max-w-sm">
              No images match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : filteredImages.length === 0 ? (
          /* Empty gallery */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No images yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm">
              Upload your first image to get started with the gallery.
            </p>
            <button
              onClick={() => openModal('upload')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Image
            </button>
          </div>
        ) : (
          /* Image grid */
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{filteredImages.length}</span>
                {searchQuery && <> of <span className="font-medium text-gray-700">{images.length}</span></>}
                {' '}{images.length === 1 ? 'image' : 'images'}
                {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onEdit={() => openModal('edit', image)}
                  onDelete={() => openModal('delete', image)}
                  onView={() => openModal('view', image)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Upload Modal */}
      <Modal isOpen={activeModal === 'upload'} onClose={closeModal} title="Upload Image" size="lg">
        <UploadForm
          onSuccess={handleUploadSuccess}
          onError={(msg) => addToast(msg, 'error')}
          onClose={closeModal}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={activeModal === 'edit'} onClose={closeModal} title="Edit Image" size="lg">
        <div className="space-y-4">
          {/* Image replacement drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Replace Image <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div
              onDrop={handleEditDrop}
              onDragOver={handleEditDragOver}
              onDragLeave={handleEditDragLeave}
              onClick={() => !editFile && editFileInputRef.current?.click()}
              className={[
                'relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden',
                editDragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50',
                !editFile ? 'cursor-pointer' : '',
              ].join(' ')}
            >
              {selectedImage && !editFile && (
                <div className="relative h-32 w-full">
                  <Image
                    src={selectedImage.url || `/uploads/${selectedImage.filename}`}
                    alt={selectedImage.title}
                    fill
                    sizes="200px"
                    className="object-contain opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-gray-500 bg-white/80 px-3 py-1.5 rounded-full">Click or drag to replace</span>
                  </div>
                </div>
              )}
              {editPreview && (
                <div className="relative">
                  <div className="relative h-32 w-full">
                    <Image
                      src={editPreview}
                      alt="New preview"
                      fill
                      sizes="200px"
                      className="object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditFile(null);
                      setEditPreview(null);
                      if (editFileInputRef.current) editFileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-3 truncate">
                    {editFile?.name} ({editFile ? (editFile.size / 1024).toFixed(1) : 0} KB)
                  </div>
                </div>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleEditFileInputChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter image title..."
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-200 text-sm text-gray-800 placeholder-gray-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter image description..."
              maxLength={1000}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-200 text-sm text-gray-800 placeholder-gray-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{editDescription.length}/1000</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeModal}
              disabled={editSaving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={editSaving || !editTitle.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {editSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title={selectedImage?.title || ''} size="xl">
        {selectedImage && (
          <div className="space-y-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ maxHeight: '70vh' }}>
              <Image
                src={selectedImage.url || `/uploads/${selectedImage.filename}`}
                alt={selectedImage.title}
                width={1200}
                height={900}
                className="w-full h-auto object-contain"
                style={{ maxHeight: '70vh' }}
                priority
              />
            </div>
            {selectedImage.description && (
              <p className="text-sm text-gray-600">{selectedImage.description}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
              <span>{(selectedImage.size / 1024).toFixed(1)} KB</span>
              <span>{selectedImage.mime_type}</span>
              <span>Uploaded {new Date(selectedImage.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Delete Image" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-medium text-gray-800">&ldquo;{selectedImage?.title}&rdquo;</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}