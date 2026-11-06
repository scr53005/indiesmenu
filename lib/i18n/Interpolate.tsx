import { Fragment, type ReactNode } from 'react';
import { interpolateParts } from './translate';

/** Renders a translated template whose placeholders hold React elements, e.g. <strong>. */
export function Interpolate({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  return <>{interpolateParts(text, values).map((part, i) => <Fragment key={i}>{part}</Fragment>)}</>;
}
