'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Alergene {
  alergene_id: number;
  name_fr: string;
  name_en: string;
}

interface IngredientAlergene {
  alergene_id: number;
  alergenes: Alergene;
}

interface Ingredient {
  ingredient_id: number;
  name: string;
  ingredients_alergenes: IngredientAlergene[];
}

export default function AdminAlergenes() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [alergenes, setAlergenes] = useState<Alergene[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [ingredientsRes, allergenesRes] = await Promise.all([
        fetch('/api/admin/ingredients'),
        fetch('/api/admin/alergenes'),
      ]);

      if (!ingredientsRes.ok || !allergenesRes.ok) {
        throw new Error('Failed to fetch data from API');
      }

      const ingredientsData = await ingredientsRes.json();
      const allergenesData = await allergenesRes.json();

      // Ensure we always set arrays
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : []);
      setAlergenes(Array.isArray(allergenesData) ? allergenesData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data. Please check console for details.');
      setIngredients([]);
      setAlergenes([]);
    } finally {
      setLoading(false);
    }
  };

  const updateAllergens = async (ingredientId: number, alergeneIds: number[]) => {
    try {
      setSaving(ingredientId);

      const response = await fetch('/api/admin/ingredients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          alergene_ids: alergeneIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const updated = await response.json();

      // Update local state
      setIngredients(prev =>
        prev.map(ing =>
          ing.ingredient_id === ingredientId
            ? updated
            : ing
        )
      );

      console.log('✓ Updated successfully');
    } catch (error) {
      console.error('Error updating allergens:', error);
      alert('Failed to update allergen assignments');
    } finally {
      setSaving(null);
    }
  };

  const handleAllergenToggle = (ingredientId: number, alergeneId: number, isChecked: boolean) => {
    const ingredient = ingredients.find(i => i.ingredient_id === ingredientId);
    if (!ingredient) return;

    const currentAlergeneIds = ingredient.ingredients_alergenes.map(ia => ia.alergene_id);
    const newAlergeneIds = isChecked
      ? [...currentAlergeneIds, alergeneId]
      : currentAlergeneIds.filter(id => id !== alergeneId);

    updateAllergens(ingredientId, newAlergeneIds);
  };

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: ingredients.length,
    assigned: ingredients.filter(ing => ing.ingredients_alergenes.length > 0).length,
    unassigned: ingredients.filter(ing => ing.ingredients_alergenes.length === 0).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title="Retour au tableau de bord"
            >
              <span className="text-3xl">←</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">
              Gestion des Allergènes
            </h1>
          </div>
          <p className="text-gray-600">
            Assignez des allergènes aux ingrédients selon le règlement UE 1169/2011
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Ingrédients</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
            <div className="text-sm text-gray-600">Avec Allergène</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
            <div className="text-sm text-gray-600">Sans Allergène</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un ingrédient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Ingredients Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Ingrédient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Allergènes Actuels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                    Assigner Allergènes (Sélection Multiple)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.map((ingredient) => {
                  const assignedAlergeneIds = ingredient.ingredients_alergenes.map(ia => ia.alergene_id);

                  return (
                    <tr key={ingredient.ingredient_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </div>
                        {saving === ingredient.ingredient_id && (
                          <span className="text-xs text-blue-600">Saving...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        {ingredient.ingredients_alergenes.length > 0 ? (
                          <div className="space-y-1">
                            {ingredient.ingredients_alergenes.map((ia) => (
                              <div key={ia.alergene_id} className="flex items-start">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                                  {ia.alergenes.name_fr}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Aucun</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="grid grid-cols-2 gap-2">
                          {alergenes.map((alergene) => {
                            const isChecked = assignedAlergeneIds.includes(alergene.alergene_id);
                            return (
                              <label
                                key={alergene.alergene_id}
                                className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={saving === ingredient.ingredient_id}
                                  onChange={(e) => handleAllergenToggle(
                                    ingredient.ingredient_id,
                                    alergene.alergene_id,
                                    e.target.checked
                                  )}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">
                                  <div className="font-medium">{alergene.name_fr}</div>
                                  <div className="text-xs text-gray-500">{alergene.name_en}</div>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun ingrédient trouvé
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            ℹ️ Information sur les allergènes
          </h3>
          <p className="text-sm text-blue-800">
            Les 14 allergènes listés sont conformes au Règlement UE 1169/2011 sur l'information
            des consommateurs concernant les denrées alimentaires. Tous les ingrédients ne
            contiennent pas nécessairement d'allergènes.
          </p>
        </div>
      </div>
    </div>
  );
}
