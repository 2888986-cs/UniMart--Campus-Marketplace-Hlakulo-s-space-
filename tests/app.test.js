/**
 * Tests for App module pure utility functions (app.js)
 * These functions don't touch the DOM — they're pure logic helpers.
 */

// ─── Pure functions copied from app.js ──────────────────────────────────────

function iconMarkup(name) {
  const icons = {
    success: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="m4.5 10 3.5 3.5 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error:   '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l8 8M14 6l-8 8" stroke-linecap="round"/></svg>',
    info:    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><path d="M10 9.25v4M10 6.75h.01" stroke-linecap="round"/></svg>',
  };
  return `<span class="ui-icon">${icons[name] || icons.info}</span>`;
}

// roleLabel logic (extracted from populateUserShell)
function getRoleLabel(accountType) {
  return accountType === 'seller_buyer' ? 'Seller / Buyer' : 'Buyer';
}

// active nav logic (extracted from setActiveNav)
function isActivePage(itemPage, currentPage) {
  return itemPage === currentPage;
}

// active page extraction (extracted from setActiveNav)
function extractPageFromPath(pathname) {
  return pathname.split('/').pop() || 'search.html';
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

// ── iconMarkup ───────────────────────────────────────────────────────────────
describe('iconMarkup', () => {
  test('returns a span wrapper', () => {
    const result = iconMarkup('success');
    expect(result).toContain('<span class="ui-icon">');
    expect(result).toContain('</span>');
  });

  test('returns success SVG for "success"', () => {
    expect(iconMarkup('success')).toContain('m4.5 10 3.5 3.5 7-7');
  });

  test('returns error SVG for "error"', () => {
    expect(iconMarkup('error')).toContain('M6 6l8 8');
  });

  test('returns info SVG for "info"', () => {
    expect(iconMarkup('info')).toContain('circle cx="10"');
  });

  test('falls back to info SVG for unknown icon name', () => {
    const unknown = iconMarkup('banana');
    const info    = iconMarkup('info');
    expect(unknown).toBe(info);
  });

  test('falls back to info SVG for empty string', () => {
    expect(iconMarkup('')).toBe(iconMarkup('info'));
  });

  test('falls back to info SVG for null', () => {
    expect(iconMarkup(null)).toBe(iconMarkup('info'));
  });

  test('output is a non-empty string', () => {
    expect(typeof iconMarkup('success')).toBe('string');
    expect(iconMarkup('success').length).toBeGreaterThan(0);
  });
});

// ── getRoleLabel ─────────────────────────────────────────────────────────────
describe('getRoleLabel', () => {
  test('returns "Seller / Buyer" for seller_buyer', () => {
    expect(getRoleLabel('seller_buyer')).toBe('Seller / Buyer');
  });

  test('returns "Buyer" for buyer', () => {
    expect(getRoleLabel('buyer')).toBe('Buyer');
  });

  test('returns "Buyer" for an unrecognised account type', () => {
    expect(getRoleLabel('admin')).toBe('Buyer');
  });

  test('returns "Buyer" for undefined', () => {
    expect(getRoleLabel(undefined)).toBe('Buyer');
  });

  test('returns "Buyer" for null', () => {
    expect(getRoleLabel(null)).toBe('Buyer');
  });
});

// ── extractPageFromPath ──────────────────────────────────────────────────────
describe('extractPageFromPath', () => {
  test('extracts filename from a normal path', () => {
    expect(extractPageFromPath('/search.html')).toBe('search.html');
  });

  test('extracts filename from a nested path', () => {
    expect(extractPageFromPath('/app/pages/dashboard.html')).toBe('dashboard.html');
  });

  test('defaults to search.html when path ends with "/"', () => {
    expect(extractPageFromPath('/')).toBe('search.html');
  });

  test('handles an empty pathname', () => {
    expect(extractPageFromPath('')).toBe('search.html');
  });

  test('handles just a filename with no leading slash', () => {
    expect(extractPageFromPath('listings.html')).toBe('listings.html');
  });
});

// ── isActivePage ─────────────────────────────────────────────────────────────
describe('isActivePage', () => {
  test('returns true when pages match', () => {
    expect(isActivePage('search.html', 'search.html')).toBe(true);
  });

  test('returns false when pages differ', () => {
    expect(isActivePage('listings.html', 'search.html')).toBe(false);
  });

  test('is case-sensitive', () => {
    expect(isActivePage('Search.html', 'search.html')).toBe(false);
  });
});
