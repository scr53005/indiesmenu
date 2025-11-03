'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
  position?: number;
}

interface DailySpecials {
  suggestions: Dish[];
  platsDuJour: Dish[];
  soupes: Dish[];
}

export default function PlatDuJourDisplay() {
  const [data, setData] = useState<DailySpecials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/daily-specials');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching daily specials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-yellow-400 text-2xl">Chargement...</p>
      </div>
    );
  }

  // Separate small and large soup
  const smallSoup = data?.soupes?.find(s => s.name.toLowerCase().includes('small'));
  const largeSoup = data?.soupes?.find(s => s.name.toLowerCase().includes('large'));

  return (
    <div className={`min-h-screen bg-black text-white relative overflow-hidden ${ptSans.className}`}>
      {/* Decorative Corners - Extracted from original image */}
      <div className="absolute top-0 left-0 w-32 h-32">
        <Image src="/images/decorations/top-left.jpg" alt="" fill className="object-contain" />
      </div>

      <div className="absolute top-0 right-0 w-32 h-32">
        <Image src="/images/decorations/top-right.jpg" alt="" fill className="object-contain" />
      </div>

      <div className="absolute bottom-0 left-0 w-32 h-32">
        <Image src="/images/decorations/bottom-left.jpg" alt="" fill className="object-contain" />
      </div>

      <div className="absolute bottom-0 right-0 w-32 h-32">
        <Image src="/images/decorations/bottom-right.jpg" alt="" fill className="object-contain" />
      </div>

      {/* Decorative Bottom Center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-20">
        <Image src="/images/decorations/bottom-center.jpg" alt="" fill className="object-contain" />
      </div>

      <div className="relative z-10 container mx-auto px-8 py-12">
        {/* Header with logos */}
        <div className="flex justify-between items-start mb-8">
          {/* Left logos */}
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 relative">
              <Image src="/images/pluxee-logo.jpeg" alt="Pluxee" fill className="object-contain" />
            </div>
            <div className="w-24 h-24 relative">
              <Image src="/images/Edenred.svg" alt="Edenred" fill className="object-contain" />
            </div>
          </div>

          {/* Center title */}
          <h1 className="text-6xl text-center font-bold text-yellow-400 tracking-wider">
            PROPOSITION DE LA SEMAINE
          </h1>

          {/* Right logos */}
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 relative">
              <Image src="/images/innopay-logo.png" alt="Innopay" fill className="object-contain" />
            </div>
            <div className="w-24 h-24 relative">
              <Image src="/images/satispay-logo.png" alt="Satispay" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* SUGGESTION Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-red-500 text-center mb-6 underline">
            SUGGESTION
          </h2>

          {data?.suggestions && data.suggestions.length > 0 && (
            <div className="text-center">
              <p className="text-2xl text-yellow-300 leading-relaxed">
                {data.suggestions.map((sugg, index) => (
                  <span key={sugg.dish_id}>
                    {index > 0 && <span className="text-yellow-400"><br/>et<br/></span>}
                    <span className={sugg.sold_out ? 'line-through' : ''}>
                      {sugg.name}
                      {sugg.description && ` ${sugg.description}`}
                    </span>
                  </span>
                ))}
                {' '}
                <span className="text-red-500 font-bold text-3xl">
                  {data.suggestions[0].price_eur}€
                </span>
              </p>
            </div>
          )}
        </div>

        {/* LES PLATS DU JOUR Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-red-500 text-center mb-8 underline">
            LES PLATS DU JOUR
          </h2>

          <div className="space-y-4">
            {data?.platsDuJour && data.platsDuJour.map((plat) => (
              <div
                key={plat.dish_id}
                className="text-center"
              >
                <p className={`text-2xl inline ${plat.sold_out ? 'line-through text-yellow-600' : 'text-yellow-400'}`}>
                  {plat.name}
                </p>
                {' '}
                <span className={`text-2xl font-bold ${plat.sold_out ? 'line-through text-red-400' : 'text-red-500'}`}>
                  {plat.price_eur}€
                </span>
              </div>
            ))}

            {/* Soup (special formatting) */}
            {(smallSoup || largeSoup) && (
              <div className="text-center mt-6">
                <p className="text-2xl text-orange-400">
                  Soupe de {smallSoup?.description || largeSoup?.description || 'Tomates'}{' '}
                  <span className="text-red-500 font-bold">
                    {smallSoup?.price_eur}€/{largeSoup?.price_eur}€
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
