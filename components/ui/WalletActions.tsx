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
    <div className="innopay-wallet-actions" onMouseDown={stop} onTouchStart={stop} onPointerDown={stop} onClick={stop}
      style={{ marginTop: 16, cursor: 'default' }}>
      <style>{`
        .innopay-wallet-actions button { font-family: inherit; cursor: pointer; }
        .innopay-wallet-actions button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .innopay-wallet-actions button:hover { filter: brightness(1.2); }
      `}</style>
      <div id={panelId} hidden={!expanded} style={{ paddingBottom: 24, maxHeight: '40vh', overflowY: 'auto' }}>
        <button type="button" onClick={forget} style={{
          display: 'block', width: '100%', padding: '12px 10px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,.35)', background: 'rgba(0,0,0,.18)',
          color: '#fff', textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.45,
        }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{t.remove}</span>
          <span style={{ display: 'block', fontSize: 11, marginTop: 4, opacity: .9 }}>{t.recovery}</span>
        </button>
        {error && <p role="alert" style={{ fontSize: 12, marginTop: 8 }}>{t.error}</p>}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setExpanded(value => !value)} style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', minHeight: 40, border: 0, borderRadius: '0 0 8px 8px',
          background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 12, fontWeight: 600,
        }}>
        <svg aria-hidden="true" viewBox="0 0 280 16" preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, top: -15, width: '100%', height: 16, pointerEvents: 'none' }}>
          <path d="M0 16H76C104 16 107 1 140 1S176 16 204 16H280Z" fill="rgba(255,255,255,.14)" />
          <path d="M128 7H152" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {expanded ? t.collapse : t.expand}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d={expanded ? 'M4 6l4 4 4-4' : 'M4 10l4-4 4 4'} />
        </svg>
      </button>
    </div>
  );
}
