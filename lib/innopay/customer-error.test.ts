import { describe, it, expect } from 'vitest';
import { customerFacingError } from './customer-error';

const CONN = 'Hmm, nous avons un problème. Vérifiez votre connexion et réessayez.';
const FALLBACK = 'Erreur lors du paiement';

describe('customerFacingError', () => {
  it('replaces raw browser fetch failures with the gentle message', () => {
    // The exact string surfaced to a customer in the 2026-07-12 zenbar E2E
    expect(customerFacingError(new TypeError('Failed to fetch'), CONN, FALLBACK)).toBe(CONN);
    // Safari and Firefox spellings
    expect(customerFacingError(new TypeError('Load failed'), CONN, FALLBACK)).toBe(CONN);
    expect(customerFacingError(new TypeError('NetworkError when attempting to fetch resource.'), CONN, FALLBACK)).toBe(CONN);
  });

  it('passes deliberate human-oriented messages through', () => {
    expect(customerFacingError(new Error('Échec de la signature du transfert EURO'), CONN, FALLBACK))
      .toBe('Échec de la signature du transfert EURO');
    expect(customerFacingError(new Error('Solde insuffisant'), CONN, FALLBACK)).toBe('Solde insuffisant');
  });

  it('falls back for non-Error throws and empty messages', () => {
    expect(customerFacingError('string throw', CONN, FALLBACK)).toBe(FALLBACK);
    expect(customerFacingError(undefined, CONN, FALLBACK)).toBe(FALLBACK);
    expect(customerFacingError(new Error(''), CONN, FALLBACK)).toBe(FALLBACK);
  });
});
