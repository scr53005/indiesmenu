'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PT_Sans } from 'next/font/google';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
});

interface Dish {
  dish_id: number;
  name: string;
  description?: string;
  price_eur: string;
  sold_out?: boolean;
  active?: boolean;
  position?: number;
}

export default function AdminDailySpecials() {
  const [suggestions, setSuggestions] = useState<Dish[]>([]);
  const [platsDuJour, setPlatsDuJour] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Debounce timer reference - one timer per dish
  const saveTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  // Accumulate pending changes for each dish
  const pendingChangesRef = useRef<Map<number, Partial<Dish>>>(new Map());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suggRes, platsRes] = await Promise.all([
        fetch('/api/admin/dishes?category=SUGGESTION'),
        fetch('/api/admin/dishes?category=PLAT DU JOUR'),
      ]);

      const suggData = await suggRes.json();
      const platsData = await platsRes.json();

      setSuggestions(suggData);
      setPlatsDuJour(platsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = async () => {
    const name = prompt('Nom du plat:');
    if (!name) return;

    const description = prompt('Description détaillée:');
    const price = prompt('Prix (€):');
    if (!price) return;

    try {
      const response = await fetch('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price_eur: price,
          category: 'SUGGESTION',
          position: suggestions.length,
        }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to add suggestion');
      }
    } catch (error) {
      console.error('Error adding suggestion:', error);
      alert('Failed to add suggestion');
    }
  };

  const handleAddPlatDuJour = async () => {
    const name = prompt('Nom du plat:');
    if (!name) return;

    const price = prompt('Prix (€):');
    if (!price) return;

    try {
      const response = await fetch('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price_eur: price,
          category: 'PLAT DU JOUR',
          position: platsDuJour.length,
        }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to add plat du jour');
      }
    } catch (error) {
      console.error('Error adding plat du jour:', error);
      alert('Failed to add plat du jour');
    }
  };

  // Debounced update function
  const handleUpdateDish = useCallback((dishId: number, updates: Partial<Dish>) => {
    // IMMEDIATELY update local state for instant UI feedback
    setSuggestions(prev =>
      prev.map(dish =>
        dish.dish_id === dishId ? { ...dish, ...updates } : dish
      )
    );
    setPlatsDuJour(prev =>
      prev.map(dish =>
        dish.dish_id === dishId ? { ...dish, ...updates } : dish
      )
    );

    // Mark that there are unsaved changes
    setUnsavedChanges(true);

    // Accumulate changes for this dish
    const currentPending = pendingChangesRef.current.get(dishId) || {};
    pendingChangesRef.current.set(dishId, { ...currentPending, ...updates });

    // Clear existing timer for THIS specific dish
    const existingTimer = saveTimersRef.current.get(dishId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer for 5 seconds for THIS specific dish
    const newTimer = setTimeout(async () => {
      try {
        setSaving(true);

        // Get all accumulated changes for this dish
        const allChanges = pendingChangesRef.current.get(dishId);
        if (!allChanges) return;

        const response = await fetch(`/api/admin/dishes/${dishId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allChanges),
        });

        if (response.ok) {
          // Check if there are any other pending changes for other dishes
          pendingChangesRef.current.delete(dishId);
          saveTimersRef.current.delete(dishId);
          if (pendingChangesRef.current.size === 0) {
            setUnsavedChanges(false);
          }
          // Optionally refresh data to ensure sync
          // fetchData();
        } else {
          alert('Failed to update dish');
          // Revert on failure
          fetchData();
          pendingChangesRef.current.delete(dishId);
          saveTimersRef.current.delete(dishId);
        }
      } catch (error) {
        console.error('Error updating dish:', error);
        alert('Failed to update dish');
        // Revert on failure
        fetchData();
        pendingChangesRef.current.delete(dishId);
        saveTimersRef.current.delete(dishId);
      } finally {
        setSaving(false);
      }
    }, 5000); // 5 second delay

    saveTimersRef.current.set(dishId, newTimer);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach(timer => clearTimeout(timer));
      saveTimersRef.current.clear();
    };
  }, []);

  const handleDeleteDish = async (dishId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat?')) return;

    try {
      const response = await fetch(`/api/admin/dishes/${dishId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete dish');
      }
    } catch (error) {
      console.error('Error deleting dish:', error);
      alert('Failed to delete dish');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-2xl">Chargement...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-100 ${ptSans.className}`}>
      {/* Admin Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-white hover:text-blue-200 transition-colors"
              title="Retour au tableau de bord"
            >
              <span className="text-2xl">←</span>
            </Link>
            <h1 className="text-3xl font-bold">Administration - Plat du Jour</h1>
            {/* Save status indicator */}
            {unsavedChanges && (
              <span className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold animate-pulse">
                Modifications en attente...
              </span>
            )}
            {saving && (
              <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold">
                Sauvegarde en cours...
              </span>
            )}
            {!unsavedChanges && !saving && (
              <span className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                ✓ Sauvegardé
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <a
              href="/display/plat-du-jour"
              target="_blank"
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
            >
              Voir l'affichage
            </a>
            <a
              href="/menu"
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
            >
              Menu
            </a>
            <a
              href="/display/printout"
              target="_blank"
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
            >
              Version imprimable
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-8">
        {/* Preview Section - Mirrors display page */}
        <div className="bg-black text-white rounded-lg p-8 mb-8 relative overflow-hidden">
          {/* Decorations */}
          <div className="absolute top-0 left-0 w-24 h-24 opacity-50">
            <Image src="/images/decorations/top-left.jpg" alt="" fill className="object-contain" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 opacity-50">
            <Image src="/images/decorations/top-right.jpg" alt="" fill className="object-contain" />
          </div>

          <div className="relative z-10">
            {/* Title */}
            <h2 className="text-5xl font-bold text-yellow-400 text-center mb-8">
              PLAT DU JOUR
            </h2>

            {/* SUGGESTION Section */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-3xl font-bold text-red-500 underline">SUGGESTION</h3>
                <button
                  onClick={handleAddSuggestion}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                >
                  + Ajouter
                </button>
              </div>

              <div className="space-y-4">
                {suggestions.map((sugg, index) => (
                  <div
                    key={sugg.dish_id}
                    className="bg-gray-800 p-4 rounded border-2 border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={sugg.name}
                          onChange={(e) =>
                            handleUpdateDish(sugg.dish_id, { name: e.target.value })
                          }
                          className="w-full bg-gray-700 text-yellow-300 text-xl p-2 rounded mb-2"
                        />
                        <textarea
                          value={sugg.description || ''}
                          onChange={(e) =>
                            handleUpdateDish(sugg.dish_id, { description: e.target.value })
                          }
                          placeholder="Description détaillée..."
                          className="w-full bg-gray-700 text-yellow-200 p-2 rounded text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={sugg.price_eur}
                          onChange={(e) =>
                            handleUpdateDish(sugg.dish_id, { price_eur: e.target.value })
                          }
                          className="w-24 bg-gray-700 text-red-500 font-bold text-xl p-2 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={sugg.active}
                            onChange={(e) =>
                              handleUpdateDish(sugg.dish_id, { active: e.target.checked })
                            }
                          />
                          Actif
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={sugg.sold_out}
                            onChange={(e) =>
                              handleUpdateDish(sugg.dish_id, { sold_out: e.target.checked })
                            }
                          />
                          Épuisé
                        </label>
                      </div>
                      <button
                        onClick={() => handleDeleteDish(sugg.dish_id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LES PLATS DU JOUR Section */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-3xl font-bold text-red-500 underline">LES PLATS DU JOUR</h3>
                <button
                  onClick={handleAddPlatDuJour}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                >
                  + Ajouter
                </button>
              </div>

              <div className="space-y-3">
                {platsDuJour.map((plat) => (
                  <div
                    key={plat.dish_id}
                    className="bg-gray-800 p-3 rounded border-2 border-gray-700 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="text"
                        value={plat.name}
                        onChange={(e) =>
                          handleUpdateDish(plat.dish_id, { name: e.target.value })
                        }
                        className="flex-1 bg-gray-700 text-yellow-400 text-lg p-2 rounded"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={plat.price_eur}
                        onChange={(e) =>
                          handleUpdateDish(plat.dish_id, { price_eur: e.target.value })
                        }
                        className="w-24 bg-gray-700 text-red-500 font-bold text-lg p-2 rounded"
                      />
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={plat.active}
                          onChange={(e) =>
                            handleUpdateDish(plat.dish_id, { active: e.target.checked })
                          }
                        />
                        Actif
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={plat.sold_out}
                          onChange={(e) =>
                            handleUpdateDish(plat.dish_id, { sold_out: e.target.checked })
                          }
                        />
                        Épuisé
                      </label>
                      <button
                        onClick={() => handleDeleteDish(plat.dish_id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Instructions</h3>
          <ul className="space-y-2 text-sm">
            <li>✓ Modifications sauvegardées automatiquement 5 secondes après la dernière modification</li>
            <li>✓ "Actif" = affiché sur l'écran public</li>
            <li>✓ "Épuisé" = affiché barré (rupture de stock)</li>
            <li>✓ Les plats inactifs sont masqués mais conservés dans la base</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
