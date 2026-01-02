'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PT_Sans } from 'next/font/google';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
});

export default function AdminDashboard() {
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  const clearCache = async () => {
    if (!confirm('Nettoyer le cache du menu ? Cela forcera un rechargement des données depuis la base de données.')) {
      return;
    }

    try {
      setClearingCache(true);
      setCacheMessage('');
      const response = await fetch('/api/admin/cache', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setCacheMessage('✓ Cache nettoyé avec succès !');
        setTimeout(() => setCacheMessage(''), 3000);
      } else {
        setCacheMessage('❌ Erreur: ' + (data.error || 'Échec du nettoyage du cache'));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setCacheMessage('❌ Erreur lors du nettoyage du cache');
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 ${ptSans.className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">🏠 Administration</h1>
              <p className="text-blue-100">Indies Menu - Gestion complète</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={clearCache}
                disabled={clearingCache}
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg transition-all"
                title="Nettoyer le cache du menu pour afficher les modifications de la base de données"
              >
                {clearingCache ? (
                  <>
                    <span className="animate-spin text-xl">⟳</span>
                    Nettoyage...
                  </>
                ) : (
                  <>
                    <span className="text-xl">🗑️</span>
                    Nettoyer le cache
                  </>
                )}
              </button>
              {cacheMessage && (
                <div className={`px-4 py-2 rounded text-sm font-semibold ${
                  cacheMessage.startsWith('✓') ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {cacheMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Daily Specials Card */}
          <Link href="/admin/daily-specials">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📅</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-blue-600">
                Plat du Jour
              </h2>
              <p className="text-gray-600 mb-4">
                Mettre à jour la suggestion et les plats du jour
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                Gérer →
              </div>
            </div>
          </Link>

          {/* Menu Card */}
          <Link href="/admin/carte">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📋</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-blue-600">
                Carte & Images
              </h2>
              <p className="text-gray-600 mb-4">
                Mettre à jour la carte et ajouter des images
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                Gérer →
              </div>
            </div>
          </Link>

          {/* Allergens Card */}
          <Link href="/admin/alergenes">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">⚠️</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-blue-600">
                Allergènes
              </h2>
              <p className="text-gray-600 mb-4">
                Gérer les allergènes et intolérances
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                Gérer →
              </div>
            </div>
          </Link>

          {/* Current Orders Card */}
          <Link href="/admin/current_orders">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500 group">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🛎️</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-green-600">
                Commandes
              </h2>
              <p className="text-gray-600 mb-4">
                Voir et gérer les commandes en cours
              </p>
              <div className="flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                Gérer →
              </div>
            </div>
          </Link>

        </div>

        {/* Quick Links */}
        <div className="mt-12 max-w-5xl mx-auto">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
            <h3 className="font-bold text-lg mb-3 text-gray-800">Liens rapides</h3>
            <div className="flex flex-wrap gap-4">
              <a
                href="/menu"
                target="_blank"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-shadow text-blue-600 font-semibold"
              >
                📱 Voir le menu client
              </a>
              <a
                href="/display/plat-du-jour"
                target="_blank"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-shadow text-blue-600 font-semibold"
              >
                🖥️ Affichage plat du jour
              </a>
              <a
                href="/display/printout"
                target="_blank"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-shadow text-blue-600 font-semibold"
              >
                🖨️ Version imprimable
              </a>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
            <h3 className="font-bold text-lg mb-2 text-gray-800">💡 Conseil</h3>
            <p className="text-gray-700">
              Après avoir modifié la base de données (ajout/suppression de plats, modification d'images),
              utilisez le bouton <strong>"Nettoyer le cache"</strong> ci-dessus pour que les changements
              apparaissent immédiatement sur le menu client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
