# Anees Health — brand & styling conventions

Anees is a premium home-healthcare brand (Egypt, bilingual EN/AR). The visual language is **soft luxury**: deep navy, antique gold, warm cream, generous rounding, soft diffuse shadows. This is a **tokens + styles** design system — there are no importable components; build your own markup and style it with the vocabulary below.

## Setup
No provider or wrapper is needed. `styles.css` ships Bootstrap 5.3 (the site's real base layer) plus the Anees token layer and base element styles, so plain HTML/JSX renders on-brand: `body` gets the cream page wash (`--surface-base`), headings render navy in Plus Jakarta Sans, buttons and inputs pick up brand shapes automatically.

For **Arabic designs**, set `dir="rtl"` and `lang="ar"` on the root element — the stylesheet then switches the font stack to IBM Plex Sans Arabic and raises line-height. Use CSS logical properties (`margin-inline-start`, `text-align: start`), never left/right.

## Styling idiom
Layout with **Bootstrap 5.3 classes** (`container`, `row`, `col-*`, `d-flex`, `gap-*`, `p-*`, `mb-*`); brand values via **CSS custom properties** — never hard-code brand hexes.

| Family | Tokens |
|---|---|
| Brand anchors | `--color-brand-dark-blue` (#132c4d navy), `--color-brand-gold` (#a68341), `--color-brand-cream` (#f4efe4) |
| Aliases | `--color-primary` (gold), `--color-secondary` (navy), `--color-text`, `--color-surface` |
| Semantic | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Status triplets (chips/badges/alerts) | `--status-{success,warning,danger,info,neutral}-fg / -bg / -border` |
| Surfaces | `--surface-base` (page), `--surface-elevated` (cards), `--surface-soft` (cream), `--surface-muted`, `--surface-inverse` (navy) |
| Text | `--text-strong` (navy headings), `--text-soft` (body), `--text-muted`, `--text-on-dark`, `--text-on-gold` |
| Borders/effects | `--border-soft`, `--border-strong`, `--ring-focus`, `--shadow-soft`, `--shadow-elevated` |
| Radius | `--radius-sm` (10px), `--radius-md` (14px, default controls via `--radius-control`), `--radius-lg` (20px), `--radius-pill` |
| Type | `--font-sans` (auto EN/AR), `--font-weight-regular/medium/semibold`; headings use `clamp()` scales already |

**Buttons** (pre-styled): `.btn.btn-primary` = navy fill (main CTA), `.btn.btn-secondary` = gold fill with navy text (secondary CTA), `.btn-outline-primary` = quiet navy outline. **Cards**: `.card` or `.surface-elevated` (elevated cream-white, soft border+shadow); `.surface-soft` for cream panels; `.surface-inverse` for navy sections with light text. **Forms**: `.form-control`/`.form-select` are pre-styled with the gold focus ring.

Hierarchy rule: navy is the workhorse (headings, primary buttons, inverse bands); gold is the accent (secondary CTAs, links, highlights) — don't flood a screen with gold. Status colors only for state, never decoration.

## Where the truth lives
Read `styles.css` → it imports `fonts/fonts.css` (Plus Jakarta Sans + IBM Plex Sans Arabic `@font-face`) and `_ds_bundle.css` (Bootstrap first, then the `:root` token block and Anees base styles — the token block is the authoritative token list).

## Example
```jsx
<section className="container py-5">
  <span style={{ color: 'var(--status-success-fg)', background: 'var(--status-success-bg)',
    border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-pill)',
    padding: '4px 12px', fontWeight: 'var(--font-weight-medium)' }}>Visit completed</span>
  <h2 className="mt-3">Care that comes to you</h2>
  <p style={{ color: 'var(--text-soft)', maxWidth: '52ch' }}>
    Hospital-grade nursing and physiotherapy, delivered at home across Cairo.
  </p>
  <div className="card p-4 mt-4" style={{ maxWidth: 420 }}>
    <h5>Book a home visit</h5>
    <input className="form-control mb-3" placeholder="Your phone number" />
    <div className="d-flex gap-2">
      <button className="btn btn-primary">Book now</button>
      <button className="btn btn-outline-primary">Learn more</button>
    </div>
  </div>
</section>
```
