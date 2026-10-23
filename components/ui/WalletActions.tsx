'use client';

import React, { useId, useState } from 'react';

const copy = {
  en: {
    expand: 'Expand', collapse: 'Collapse', remove: 'Delete this wallet',
    recovery: '(you can always re-import it using your email or the saved keys)',
    confirm: 'Remove @{account} from this browser? The account and its funds remain available. You can re-import it using your email or saved keys.',
    error: 'The wallet could not be fully removed. Please try again.',
  },
  fr: {
    expand: 'Développer', collapse: 'Réduire', remove: 'Effacer ce portemonnaie',
    recovery: '(vous pourrez toujours le re-importer en utilisant votre email ou les clés sauvegardées)',
    confirm: 'Effacer @{account} de ce navigateur ? Le compte et ses fonds restent disponibles. Vous pourrez le réimporter avec votre email ou vos clés sauvegardées.',
    error: 'Le portemonnaie n’a pas pu être entièrement effacé. Veuillez réessayer.',
  },
  lb: {
    expand: 'Ausklappen', collapse: 'Zesummeklappen', remove: 'Dëse Portmonni läschen',
    recovery: '(Dir kënnt en ëmmer nees mat Ärer E-Mail oder de gespäicherte Schlësselen importéieren)',
    confirm: '@{account} aus dësem Browser läschen? De Kont a säi Guthaben bleiwen disponibel. Dir kënnt en nees mat Ärer E-Mail oder de gespäicherte Schlësselen importéieren.',
    error: 'De Portmonni konnt net komplett geläscht ginn. Probéiert w.e.g. nach eng Kéier.',
  },
  ro: {
    expand: 'Extinde', collapse: 'Restrânge', remove: 'Șterge acest portofel',
    recovery: '(îl poți reimporta oricând folosind adresa de email sau cheile salvate)',
    confirm: 'Ștergi @{account} din acest browser? Contul și fondurile rămân disponibile. Îl poți reimporta folosind adresa de email sau cheile salvate.',
    error: 'Portofelul nu a putut fi șters complet. Încearcă din nou.',
  },
  de: {
    expand: 'Erweitern', collapse: 'Einklappen', remove: 'Diese Wallet löschen',
    recovery: '(du kannst sie jederzeit mit deiner E-Mail oder den gespeicherten Schlüsseln erneut importieren)',
    confirm: '@{account} aus diesem Browser entfernen? Das Konto und sein Guthaben bleiben verfügbar. Du kannst es mit deiner E-Mail oder gespeicherten Schlüsseln erneut importieren.',
    error: 'Die Wallet konnte nicht vollständig entfernt werden. Bitte erneut versuchen.',
  },
};

/** Shared by the hub and spokes, including Zenbar's Shadow DOM widget. */
export default function WalletActions({ accountName, language = 'fr', onForget }: {
  accountName: string;
  language?: string;
  onForget: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const panelId = useId();
  const t = copy[language as keyof typeof copy] ?? copy.en;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  const forget = () => {
    if (!window.confirm(t.confirm.replace('{account}', accountName.replace(/^@/, '')))) return;
    try {
      setError(false);
      onForget();
    } catch {
      setError(true);
    }
  };

  return (
    <div className="innopay-wallet-actions" onMouseDown={stop} onTouchStart={stop} onPointerDown={stop} onClick={stop}>
      <style>{`
        .innopay-miniwallet {
          box-sizing: border-box; padding: 8px 10px 0; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14); color: #fff;
          box-shadow: 0 4px 16px rgba(15,23,42,.18); width: 250px; min-width: 220px; max-width: 280px;
        }
        .innopay-miniwallet .mw-header { display: flex; align-items: center; gap: 7px; }
        .innopay-miniwallet .mw-grip { flex-shrink: 0; width: 7px; opacity: .4; }
        .innopay-miniwallet .mw-info { flex: 1; min-width: 0; }
        .innopay-miniwallet .mw-title { display: block; font-size: 11px; line-height: 14px; margin: 0 0 3px; opacity: .75; }
        .innopay-miniwallet .mw-balance-row { display: flex; align-items: center; gap: 7px; }
        .innopay-miniwallet .mw-icon { width: 20px; height: 20px; flex-shrink: 0; opacity: .9; }
        .innopay-miniwallet .mw-amount { display: block; font-size: 18px; font-weight: 650; line-height: 21px; margin: 0; font-variant-numeric: tabular-nums; }
        .innopay-miniwallet .mw-account { display: block; font-size: 11px; line-height: 14px; color: inherit; opacity: .75; text-decoration: none; }
        .innopay-miniwallet .mw-account:hover { opacity: 1; text-decoration: underline; }
        .innopay-miniwallet .mw-close { display: grid; place-items: center; flex-shrink: 0; width: 26px; height: 26px; padding: 4px; border: 0; border-radius: 6px; background: transparent; color: inherit; opacity: .7; cursor: pointer; }
        .innopay-miniwallet .mw-close:hover { opacity: 1; background: rgba(255,255,255,.1); }
        .innopay-miniwallet .mw-close svg { width: 16px; height: 16px; }
        .innopay-wallet-actions { margin: 7px -10px 0; cursor: default; }
        .innopay-wallet-actions button { font-family: inherit; cursor: pointer; color: inherit; }
        .innopay-wallet-actions button:focus-visible { outline: 2px solid #fff; outline-offset: -3px; }
        .innopay-wallet-panel { padding: 5px 10px 6px; background: rgba(0,0,0,.09); border-top: 1px solid rgba(255,255,255,.12); max-height: 40vh; overflow-y: auto; }
        .innopay-wallet-delete { display: flex; align-items: flex-start; gap: 7px; width: 100%; padding: 5px 0; border: 0; background: transparent; text-align: left; white-space: normal; line-height: 1.35; border-radius: 4px; }
        .innopay-wallet-delete:hover { background: rgba(255,255,255,.06); }
        .innopay-wallet-delete strong { display: block; font-size: 12px; font-weight: 600; }
        .innopay-wallet-delete small { display: block; font-size: 11px; margin-top: 2px; opacity: .78; }
        .innopay-wallet-toggle { position: relative; display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; height: 28px; padding: 0; border: 0; border-radius: 0 0 11px 11px; background: rgba(255,255,255,.06); font-size: 11px; font-weight: 500; }
        .innopay-wallet-toggle:hover { background: rgba(255,255,255,.1); }
      `}</style>
      <div id={panelId} hidden={!expanded} className="innopay-wallet-panel">
        <button type="button" onClick={forget} className="innopay-wallet-delete">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"
            style={{ flexShrink: 0, marginTop: 1, opacity: .8 }}>
            <path d="M3 5h14M7 5V3h6v2M5 5l1 12h8l1-12M8 8v6m4-6v6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span><strong>{t.remove}</strong><small>{t.recovery}</small></span>
        </button>
        {error && <p role="alert" style={{ fontSize: 11, margin: '4px 0' }}>{t.error}</p>}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={panelId} className="innopay-wallet-toggle"
        onClick={() => setExpanded(value => !value)}>
        <svg aria-hidden="true" viewBox="0 0 280 5" preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, top: -4, width: '100%', height: 5, pointerEvents: 'none' }}>
          <path d="M0 5H116C128 5 128 1 140 1S152 5 164 5H280" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.16)" strokeWidth=".7" />
        </svg>
        {expanded ? t.collapse : t.expand}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d={expanded ? 'M4 6l4 4 4-4' : 'M4 10l4-4 4 4'} />
        </svg>
      </button>
    </div>
  );
}
