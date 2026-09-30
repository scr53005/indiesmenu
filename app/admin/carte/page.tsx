'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Match {
  id: number;
  name: string;
  type: 'dish' | 'drink';
  similarity: number;
  currentImage: string | null;
}

interface ImageMatch {
  imageName: string;
  matches: Match[];
}

interface Dish {
  dish_id: number;
  name: string;
  price_eur: string;
  image: string | null;
  active: boolean;
}

interface Drink {
  drink_id: number;
  name: string;
  image: string | null;
}

interface Selection {
  imageName: string;
  itemType: 'dish' | 'drink';
  itemId: number;
  itemName: string;
}

interface DetectionInfo {
  source: string;
  count: number;
}

export default function AdminCarte() {
  const [imageMatches, setImageMatches] = useState<ImageMatch[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detectionInfo, setDetectionInfo] = useState<DetectionInfo | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Step 1: Detect real image files that are not yet assigned in the database.
      console.log('[CARTE] Detecting unassigned menu images...');
      const detectResponse = await fetch('/api/admin/detect-new-images');

      if (!detectResponse.ok) {
        throw new Error('Failed to detect new images');
      }

      const detectData = await detectResponse.json();
      const newImages = detectData.images || [];
      console.log('[CARTE] Detected images:', newImages);

      // Store detection info for display
      setDetectionInfo({
        source: detectData.source || 'public/images',
        count: detectData.count || 0,
      });

      if (newImages.length === 0) {
        console.log('[CARTE] No unassigned menu images found');
        setImageMatches([]);
      } else {
        // Step 2: Get fuzzy matches for detected images
        console.log('[CARTE] Finding fuzzy matches for', newImages.length, 'images...');
        const matchResponse = await fetch('/api/admin/match-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageNames: newImages,
          }),
        });

        if (!matchResponse.ok) {
          throw new Error('Failed to get image matches');
        }

        const matchData = await matchResponse.json();
        setImageMatches(matchData.results);
      }

      // Load all dishes and drinks
      const [dishesRes, drinksRes] = await Promise.all([
        fetch('/api/admin/dishes'),
        fetch('/api/admin/drinks'),
      ]);

      if (!dishesRes.ok || !drinksRes.ok) {
        throw new Error('Failed to load menu data');
      }

      setDishes(await dishesRes.json());
      setDrinks(await drinksRes.json());

    } catch (error: any) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (imageName: string, match: Match) => {
    const key = `${imageName}:${match.type}:${match.id}`;
    const newSelections = new Map(selections);

    // Each image can be assigned to multiple rows (for example, one image for
    // several sizes/variants), while each checkbox remains independently toggleable.
    if (selections.has(key)) {
      newSelections.delete(key);
    } else {
      newSelections.set(key, {
        imageName,
        itemType: match.type,
        itemId: match.id,
        itemName: match.name,
      });
    }

    setSelections(newSelections);
  };

  const handleSubmit = async () => {
    if (selections.size === 0) {
      setMessage({ type: 'error', text: 'No selections made' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const assignments = Array.from(selections.values());

      const response = await fetch('/api/admin/update-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update images');
      }

      setMessage({
        type: 'success',
        text: `Updated ${result.dishesUpdated} dishes and ${result.drinksUpdated} drinks. Menu cache refreshed.`,
      });

      // Clear selections and reload
      setSelections(new Map());
      await loadData();

    } catch (error: any) {
      console.error('Error updating images:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Retour au tableau de bord"
          >
            <span className="text-3xl">←</span>
          </Link>
          <h1 className="text-3xl font-bold">Admin - Carte & Images</h1>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Image Matching Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Unassigned Menu Images</h2>
            {detectionInfo && (
              <div className="text-sm text-gray-500">
                📋 Source: {detectionInfo.source} · {detectionInfo.count} image{detectionInfo.count !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            Detected from <code>public/images</code>. Select every dish or drink that should use each image,
            then apply all associations in one transaction.
          </p>

          {imageMatches.length === 0 ? (
            <p className="text-gray-500 italic">No unassigned menu images detected</p>
          ) : (
            <div className="space-y-6">
              {imageMatches.map((imageMatch) => (
                <div key={imageMatch.imageName} className="border border-gray-200 rounded-lg p-4">
                  {/* Image Preview */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={`/images/${imageMatch.imageName}`}
                        alt={imageMatch.imageName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{imageMatch.imageName}</h3>
                      <p className="text-sm text-gray-600">
                        {imageMatch.matches.length === 0
                          ? 'No matches found'
                          : `${imageMatch.matches.length} potential match${imageMatch.matches.length > 1 ? 'es' : ''}`}
                      </p>
                    </div>
                  </div>

                  {/* Matches */}
                  {imageMatch.matches.length > 0 && (
                    <div className="space-y-2">
                      {imageMatch.matches.map((match) => {
                        const selectionKey = `${imageMatch.imageName}:${match.type}:${match.id}`;
                        const isSelected = selections.has(selectionKey);

                        return (
                          <label
                            key={`${match.type}-${match.id}`}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectMatch(imageMatch.imageName, match)}
                              className="w-5 h-5"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{match.name}</div>
                              <div className="text-sm text-gray-600">
                                {match.type === 'dish' ? '🍽️ Dish' : '🍹 Drink'} · Similarity: {(match.similarity * 100).toFixed(1)}%
                                {match.currentImage && ` · Current image: ${match.currentImage}`}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          {selections.size > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selections.size} image{selections.size > 1 ? 's' : ''} selected
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Apply Image Associations'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">Dishes</h3>
            <p className="text-3xl font-bold text-blue-600">{dishes.length}</p>
            <p className="text-sm text-gray-600 mt-1">
              {dishes.filter((d) => d.image).length} with images
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">Drinks</h3>
            <p className="text-3xl font-bold text-green-600">{drinks.length}</p>
            <p className="text-sm text-gray-600 mt-1">
              {drinks.filter((d) => d.image).length} with images
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
