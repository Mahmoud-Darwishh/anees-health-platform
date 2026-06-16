/**
 * Small "ⓘ" affordance that carries an explanation in a tooltip instead of
 * cluttering the main UI with descriptive prose. Reused across card headers.
 */
export function InfoHint({ text }: { text: string }) {
  return (
    <span className="anees-info" tabIndex={0} role="note" aria-label={text} title={text}>
      i
    </span>
  );
}
