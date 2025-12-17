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

export default function PrintoutDisplay() {
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
    // Refresh every hour
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-800 text-2xl">Chargement...</p>
      </div>
    );
  }

  // Separate small and large soup
  const smallSoup = data?.soupes?.find(s => s.name.toLowerCase().includes('small'));
  const largeSoup = data?.soupes?.find(s => s.name.toLowerCase().includes('large'));

  return (
    <>
      {/* Print-specific CSS for A3 landscape */}
      <style jsx global>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className={`min-h-screen bg-white text-gray-900 relative overflow-hidden ${ptSans.className}`}>

        {/* Decorative Bottom Center (corners removed for cleaner print) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-20">
          <Image src="/images/decorations/bottom-center.jpg" alt="" fill className="object-contain" />
        </div>

        {/* Bottom Logos Container */}
        <div className="absolute bottom-16 w-full px-8">
          <div className="container mx-auto flex justify-between">
            {/* Left Bottom Logo (Edenred) */}
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 relative">
                <Image src="/images/Edenred.svg" alt="Edenred" fill className="object-contain" />
              </div>
            </div>

            {/* Right Bottom Logo (Pluxee) */}
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 relative">
                <Image src="/images/pluxee-logo.jpeg" alt="Pluxee" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-8 py-12">

          {/* Header with logos */}
          <div className="flex justify-between items-start mb-2">

            {/* Left logo (Innopay) */}
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 relative">
                <Image src="/images/innopay-logo.png" alt="Innopay" fill className="object-contain" />
              </div>
            </div>

            {/* Center title */}
            <h2 className="text-5xl text-center font-bold text-blue-900 tracking-wider">
              PROPOSITION DE LA SEMAINE
            </h2>

            {/* Right logo (Satispay) */}
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 relative">
                <Image src="/images/satispay-logo.png" alt="Satispay" fill className="object-contain" />
              </div>
            </div>
          </div>

          {/* SUGGESTION Section */}
          <div className="mb-4">
            <h2 className="text-4xl font-bold text-red-800 text-center mb-2 underline">
              SUGGESTION
            </h2>
            {data?.suggestions && data.suggestions.length > 0 && (
              <div className="text-center -mt-2">
                <p className="text-5xl font-bold text-blue-900 leading-tight">
                  {data.suggestions.map((sugg, index) => (
                    <span key={sugg.dish_id}>
                      {index > 0 && <span className="text-blue-700"><br/>et<br/></span>}
                      <span className={sugg.sold_out ? 'line-through text-gray-400' : ''}>
                        {sugg.name}
                        {sugg.description && ` ${sugg.description}`}
                      </span>
                    </span>
                  ))}
                  {' '}
                  <span className="text-red-600 font-bold text-4xl">
                    {data.suggestions[0].price_eur}€
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* LES PLATS DU JOUR Section */}
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-red-800 text-center mb-2 mt-4 underline">
              LES PLATS DU JOUR
            </h2>

            <div className="space-y-4">
              {data?.platsDuJour && data.platsDuJour.map((plat) => (
                <div
                  key={plat.dish_id}
                  className="text-center"
                >
                  <p className={`text-4xl font-bold inline ${plat.sold_out ? 'line-through text-gray-400' : 'text-blue-900'}`}>
                    {plat.name}
                  </p>
                  {' '}
                  <span className={`text-4xl font-bold ${plat.sold_out ? 'line-through text-gray-400' : 'text-red-600'}`}>
                    {plat.price_eur}€
                  </span>
                </div>
              ))}

              {/* Soup (special formatting) */}
              {(smallSoup || largeSoup) && (
                <div className="text-center mt-6">
                  <p className="text-4xl font-bold text-blue-800">
                    Soupe de {smallSoup?.description || largeSoup?.description || 'Tomates'}{' '}
                    <span className="text-red-600 font-bold">
                      {smallSoup?.price_eur}€/{largeSoup?.price_eur}€
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
