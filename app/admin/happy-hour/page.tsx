'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

interface GalleryImage {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

interface GalleryResponse {
  images: GalleryImage[];
  activeUrl: string | null;
  totalBytes: number;
  count: number;
  maxImages: number;
  maxBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function HappyHourImageAdmin() {
  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/happy-hour-image', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setGallery(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Impossible de charger la galerie.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau lors du chargement de la galerie.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/admin/happy-hour-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Image ajoutée et activée ! Elle apparaîtra sur l\'écran dans quelques minutes.' });
        clearSelection();
        await loadGallery();
      } else {
        setMessage({ type: 'error', text: data.error || 'Échec du téléversement.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau lors du téléversement.' });
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (url: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/happy-hour-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Image activée.' });
        await loadGallery();
      } else {
        setMessage({ type: 'error', text: data.error || 'Échec de l\'activation.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm('Supprimer définitivement cette image de la galerie ?')) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/happy-hour-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Image supprimée.' });
        await loadGallery();
      } else {
        setMessage({ type: 'error', text: data.error || 'Échec de la suppression.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setBusy(false);
    }
  };

  const atCapacity =
    !!gallery && (gallery.count >= gallery.maxImages || gallery.totalBytes >= gallery.maxBytes);

  return (
    <div className={`min-h-screen bg-gray-100 ${lato.className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">🍹 Images Happy Hour</h1>
            <p className="text-blue-100">Galerie des images affichées pendant le happy hour</p>
          </div>
          <Link
            href="/admin"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </div>

      <div className="container mx-auto p-8 max-w-5xl">
        {/* Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
          <p className="text-gray-700 text-sm">
            L&apos;image <strong>active</strong> s&apos;affiche automatiquement sur l&apos;écran du plat du
            jour pendant le happy hour (lundi–vendredi, 14h50–17h45). Les images téléversées sont
            <strong> conservées</strong> dans la galerie — vous pouvez réactiver une ancienne image à
            tout moment. Formats : JPG, PNG ou WebP. Capacité : 10 images / 100 Mo max.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm font-semibold ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Ajouter une image</h2>
            {gallery && (
              <span className={`text-sm font-semibold ${atCapacity ? 'text-red-600' : 'text-gray-500'}`}>
                {gallery.count}/{gallery.maxImages} images · {formatBytes(gallery.totalBytes)}/100 Mo
              </span>
            )}
          </div>

          {atCapacity && (
            <p className="text-sm text-red-600 mb-3 font-semibold">
              Galerie pleine — supprimez une image ci-dessous avant d&apos;en ajouter une nouvelle.
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={atCapacity}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
          />

          {previewUrl && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Aperçu :</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Aperçu"
                className="max-h-72 w-auto mx-auto rounded-lg border border-gray-200 bg-black"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || busy || atCapacity}
            className="mt-6 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold shadow transition-colors flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="animate-spin text-xl">⟳</span>
                Traitement...
              </>
            ) : (
              <>📤 Téléverser et activer</>
            )}
          </button>
        </div>

        {/* Gallery */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Galerie</h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : !gallery || gallery.images.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-6 text-gray-500">
            Aucune image téléversée. L&apos;écran affiche l&apos;image par défaut (happyhour2.png) en
            attendant.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.images.map((img) => {
              const isActive = img.url === gallery.activeUrl;
              return (
                <div
                  key={img.url}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
                    isActive ? 'border-green-500' : 'border-transparent'
                  }`}
                >
                  <div className="relative bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-48 object-contain" />
                    {isActive && (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                        ● ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-3">
                      {formatDate(img.uploadedAt)} · {formatBytes(img.size)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleActivate(img.url)}
                        disabled={busy || isActive}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isActive ? 'Affichée' : 'Afficher'}
                      </button>
                      <button
                        onClick={() => handleDelete(img.url)}
                        disabled={busy}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
