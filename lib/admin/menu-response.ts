import { NextResponse } from 'next/server';
import { MenuValidationError } from './menu';

export function menuError(error: unknown) {
  if (error instanceof MenuValidationError || error instanceof SyntaxError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'P2002') return NextResponse.json({ error: 'Ce nom ou cette taille existe déjà.' }, { status: 409 });
  if (code === 'P2025') return NextResponse.json({ error: 'Produit introuvable. Rechargez la carte.' }, { status: 404 });
  if (code === 'P2003') return NextResponse.json({ error: 'Une association est invalide ou ce produit est encore utilisé.' }, { status: 409 });
  console.error('[ADMIN MENU]', error);
  return NextResponse.json({ error: 'Impossible d’enregistrer ou de charger la carte. Réessayez.' }, { status: 500 });
}
