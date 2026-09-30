'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { PT_Sans } from 'next/font/google';
import { HAPPY_HOUR_IMAGE_FALLBACK } from '@/lib/happyHour';
import {
  BREAKFAST_IMAGE_PATH,
  getActiveDisplayOffer,
} from '@/lib/displayOffer';
import type { DisplayOffer } from '@/lib/displayOffer';

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

/** Resolve the scheduled display from the current Luxembourg wall-clock. */
function getCurrentDisplayOffer(): DisplayOffer {
  const now = new Date();
  const luxTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Luxembourg' }));
  const day = luxTime.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const timeInMinutes = luxTime.getHours() * 60 + luxTime.getMinutes();
  return getActiveDisplayOffer(day, timeInMinutes);
}

function BreakfastOfferDisplay() {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-black ${ptSans.className}`}
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* The artwork is a known local asset. A plain image avoids next/image's
          fill requirement for a measurable positioned parent on this TV page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BREAKFAST_IMAGE_PATH}
        alt="Offre petit déjeuner"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function HappyHourDisplay({ imageUrl }: { imageUrl: string }) {
  return (
    <div className={`min-h-screen bg-black text-white relative overflow-hidden ${ptSans.className}`}>
      {/* Decorative Corners */}
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

      {/* Top logos: Innopay (left), Satispay (right) */}
      <div className="absolute top-4 left-36 w-24 h-24 z-20">
        <Image src="/images/innopay-logo.png" alt="Innopay" fill className="object-contain" />
      </div>
      <div className="absolute top-4 right-36 w-[64px] h-[64px] z-0">
        <Image src="/images/satispay-logo.png" alt="Satispay" fill className="object-contain" />
      </div>

      {/* Bottom logos: Edenred (left), Pluxee (right) */}
      <div className="absolute bottom-16 left-36 w-24 h-24 z-20">
        <Image src="/images/Edenred.svg" alt="Edenred" fill className="object-contain" />
      </div>
      <div className="absolute bottom-16 right-36 w-[60px] h-[60px] z-0">
        <Image src="/images/pluxee-logo.jpeg" alt="Pluxee" fill className="object-contain" />
      </div>

      {/* Happy Hour image centered, preserving proportions.
          Plain <img> (not next/image) because the source is a runtime-uploaded
          Blob URL of unknown dimensions/host; next/image would need remotePatterns
          config and fixed width/height. This is a signage screen, not a perf-
          critical customer page, so object-contain on a raw <img> is fine. */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-16">
        <div className="relative w-full max-w-5xl aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Happy Hour"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default function PlatDuJourDisplay() {
  const [data, setData] = useState<DailySpecials | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayOffer, setDisplayOffer] = useState<DisplayOffer | null>(null);
  const [happyHourImage, setHappyHourImage] = useState(HAPPY_HOUR_IMAGE_FALLBACK);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/daily-specials');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching daily specials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHappyHourImage = useCallback(async () => {
    try {
      const response = await fetch('/api/happy-hour-image', { cache: 'no-store' });
      const result = await response.json();
      if (result?.url) setHappyHourImage(result.url);
    } catch (error) {
      // Non-fatal: keep whatever we have (defaults to the committed fallback).
      console.error('Error fetching happy hour image:', error);
    }
  }, []);

  useEffect(() => {
    // Resolve the display immediately, then keep schedule checks independent
    // from the slower content refresh so offer boundaries are not 15 minutes late.
    setDisplayOffer(getCurrentDisplayOffer());
    fetchData();
    fetchHappyHourImage();

    const scheduleInterval = setInterval(() => {
      setDisplayOffer(getCurrentDisplayOffer());
    }, 60 * 1000);

    const contentInterval = setInterval(() => {
      fetchData();
      fetchHappyHourImage();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(scheduleInterval);
      clearInterval(contentInterval);
    };
  }, [fetchData, fetchHappyHourImage]);

  if (displayOffer === 'breakfast') {
    return <BreakfastOfferDisplay />;
  }

  if (displayOffer === 'happy-hour') {
    return <HappyHourDisplay imageUrl={happyHourImage} />;
  }

  if (displayOffer === null || loading) {
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

    {/* Decorative Corners - NO CHANGE */}
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

    {/* Decorative Bottom Center - NO CHANGE */}
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
          <div className="w-[60px] h-[60px] relative">
            <Image src="/images/pluxee-logo.jpeg" alt="Pluxee" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>


    <div className="relative z-10 container mx-auto px-8 py-12">

      {/* Header with logos */}
      <div className="flex justify-between items-start mb-2">

        {/* Left logo (ONLY INNOPAY) */}
        <div className="flex gap-4 items-center">
          <div className="w-24 h-24 relative">
            <Image src="/images/innopay-logo.png" alt="Innopay" fill className="object-contain" />
          </div>
        </div>

        {/* Center title - NO CHANGE */}
        <h2 className="text-5xl text-center font-bold text-yellow-400 tracking-wider">
          PROPOSITION DE LA SEMAINE
        </h2>

        {/* Right logo (ONLY SATISPAY) */}
        <div className="flex gap-4 items-center">
          <div className="w-[64px] h-[64px] relative">
            <Image src="/images/satispay-logo.png" alt="Satispay" fill className="object-contain" />
          </div>
        </div>
      </div>

      {/* --- SUGGESTION Section --- */}
      <div className="mb-4">
        <h2 className="text-4xl font-bold text-red-500 text-center mb-2 underline">
          SUGGESTION
        </h2>
        {data?.suggestions && data.suggestions.length > 0 && (
          <div className="text-center -mt-2">
            <p className="text-5xl font-bold text-yellow-300 leading-tight">
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
              <span className="text-red-500 font-bold text-4xl">
                {data.suggestions[0].price_eur}€
              </span>
            </p>
          </div>
        )}
      </div>

      {/* --- LES PLATS DU JOUR Section --- */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-red-500 text-center mb-2 mt-4 underline">
          LES PLATS DU JOUR
        </h2>

        <div className="space-y-4">
          {data?.platsDuJour && data.platsDuJour.map((plat) => (
            <div
              key={plat.dish_id}
              className="text-center"
            >
              <p className={`text-4xl font-bold inline ${plat.sold_out ? 'line-through text-yellow-600' : 'text-yellow-400'}`}>
                {plat.name}
              </p>
              {' '}
              <span className={`text-4xl font-bold ${plat.sold_out ? 'line-through text-red-400' : 'text-red-500'}`}>
                {plat.price_eur}€
              </span>
            </div>
          ))}

          {/* Soup (special formatting) */}
          {(smallSoup || largeSoup) && (
            <div className="text-center mt-6">
              <p className="text-4xl font-bold text-orange-400">
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
