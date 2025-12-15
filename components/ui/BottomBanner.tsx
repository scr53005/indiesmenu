'use client';

import React, { useState } from 'react';

interface BottomBannerProps {
  language?: 'fr' | 'en';
}

export default function BottomBanner({ language = 'fr' }: BottomBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const translations = {
    fr: {
      contact: 'Pour toute question ou signalement, veuillez nous écrire à',
      email: 'contact@innopay.lu',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions générales',
      tapToExpand: 'Appuyez pour plus d\'informations',
      tapToCollapse: 'Appuyez pour réduire',
    },
    en: {
      contact: 'For any questions or reports, please write to us at',
      email: 'contact@innopay.lu',
      privacy: 'Privacy Policy',
      terms: 'Terms and Conditions',
      tapToExpand: 'Tap for more information',
      tapToCollapse: 'Tap to collapse',
    },
  };

  const t = translations[language];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-t from-gray-800 to-gray-700 text-white transition-all duration-300 ease-in-out shadow-2xl"
      style={{
        height: isExpanded ? '200px' : '30px',
      }}
    >
      {/* Clickable header/tab */}
      <div
        className="flex items-center justify-center h-[30px] cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isExpanded ? t.tapToCollapse : t.tapToExpand}
          </span>
          <span className="text-lg">
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 py-4 overflow-y-auto" style={{ height: 'calc(100% - 30px)' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Contact info */}
            <div className="text-center">
              <p className="text-sm mb-2">{t.contact}</p>
              <a
                href={`mailto:${t.email}`}
                className="text-blue-300 hover:text-blue-200 underline font-medium"
              >
                {t.email}
              </a>
            </div>

            {/* Legal links */}
            <div className="flex justify-center gap-6 pt-2 border-t border-gray-600">
              <a
                href="https://www.innopay.lu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-300 hover:text-white underline transition-colors"
              >
                {t.privacy}
              </a>
              <a
                href="https://www.innopay.lu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-300 hover:text-white underline transition-colors"
              >
                {t.terms}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
