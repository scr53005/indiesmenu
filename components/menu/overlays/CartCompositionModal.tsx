'use client';

// "Composition de la commande", opened from the transmission-error banner so the customer can
// show the waiter what they paid for. Extracted from app/menu/page.tsx in R2; markup unchanged.
import type { CartItem } from '@/app/context/CartContext';
import { useI18n } from '@/lib/i18n';

export default function CartCompositionModal({ open, cart, total, onClose }: {
  open: boolean;
  cart: CartItem[];
  /** Formatted cart total, "12.34". */
  total: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">{t('composition.title')}</h2>
          <button onClick={onClose} className="text-2xl hover:text-gray-200 transition-colors">×</button>
        </div>
        <div className="p-6">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('composition.empty')}</p>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        {item.options?.size && (
                          <p className="text-sm text-gray-600">{t('composition.size', { value: item.options.size })}</p>
                        )}
                        {item.options?.cuisson && (
                          <p className="text-sm text-gray-600">{t('composition.cuisson', { value: item.options.cuisson })}</p>
                        )}
                        {item.options?.selectedIngredients && item.options.selectedIngredients.length > 0 && (
                          <p className="text-sm text-gray-600">
                            {t('composition.ingredients', { value: item.options.selectedIngredients })}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">{t('composition.quantity', { value: item.quantity })}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-800">{(parseFloat(item.price) * item.quantity).toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">{t('composition.total')}</span>
                  <span className="text-2xl font-bold text-blue-600">{total} €</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
