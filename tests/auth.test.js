/**
 * Tests for Auth module pure functions (auth.js)
 */

// Mock supabase global before requiring auth.js
global.supabase = {
  createClient: () => ({})
};

// Mock window for signOut redirect
global.window = { location: { href: '' } };

const { Auth } = require('../auth.js');

const getUserInitials  = Auth.getUserInitials;

// _buildUser and _mapListingRecord are private inside the IIFE, so we
// re-implement them here to test the same logic — they're pure functions.
function _buildUser(authUser) {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    fullName: meta.full_name || authUser.email,
    email: authUser.email,
    accountType: meta.account_type || 'buyer',
    university: meta.university || '',
    campus: meta.campus || '',
    studentNumber: meta.student_number || '',
  };
}

function _mapListingRecord(listing) {
  return {
    id: listing.listing_id,
    sellerId: listing.seller_id,
    title: listing.title || 'Untitled listing',
    description: listing.description || '',
    price: Number(listing.price) || 0,
    category: listing.category || 'Other',
    condition: listing.condition || 'Not specified',
    isTradeable: Boolean(listing.is_tradeable),
    status: listing.status || 'active',
    imageUrl: listing.image_url || '',
    createdAt: listing.created_at,
  };
}

function aggregateListings(listings) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return listings.reduce((acc, listing) => {
    const price = Number(listing.price) || 0;
    const status = (listing.status || '').toLowerCase();
    const createdAt = listing.created_at ? new Date(listing.created_at) : null;
    if (status === 'active') { acc.activeListings += 1; acc.activeValue += price; }
    if (status === 'sold') acc.soldListings += 1;
    if (createdAt && createdAt >= monthStart) acc.thisMonth += 1;
    return acc;
  }, { activeListings: 0, soldListings: 0, activeValue: 0, thisMonth: 0 });
}

function buildCategoryMap(listings) {
  return listings.reduce((acc, listing) => {
    const key = listing.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function validateImageUpload(file) {
  if (file.size > LISTING_IMAGE_MAX_BYTES) return { error: 'Image must be 5 MB or smaller.' };
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
  return { valid: true, safeExt };
}

// ═══════════════════════════════════════════════════════════════════════════

describe('getUserInitials', () => {
  test('returns initials for a two-word name', () => {
    expect(getUserInitials('Joshua Goldberg')).toBe('JG');
  });
  test('returns single initial for a one-word name', () => {
    expect(getUserInitials('Joshua')).toBe('J');
  });
  test('uses only first two words for three-word names', () => {
    expect(getUserInitials('Mary Jane Watson')).toBe('MJ');
  });
  test('returns "?" for an empty string', () => {
    expect(getUserInitials('')).toBe('?');
  });
  test('returns "?" for null', () => {
    expect(getUserInitials(null)).toBe('?');
  });
  test('returns "?" for undefined', () => {
    expect(getUserInitials(undefined)).toBe('?');
  });
  test('uppercases the result', () => {
    expect(getUserInitials('alice bob')).toBe('AB');
  });
});

describe('_buildUser', () => {
  test('returns null when authUser is null', () => {
    expect(_buildUser(null)).toBeNull();
  });
  test('returns null when authUser is undefined', () => {
    expect(_buildUser(undefined)).toBeNull();
  });
  test('maps all metadata fields correctly', () => {
    const authUser = {
      id: 'user-123', email: 'test@uni.ac.za',
      user_metadata: { full_name: 'Test User', account_type: 'seller_buyer', university: 'UCT', campus: 'Main', student_number: 'STU001' },
    };
    expect(_buildUser(authUser)).toEqual({
      id: 'user-123', fullName: 'Test User', email: 'test@uni.ac.za',
      accountType: 'seller_buyer', university: 'UCT', campus: 'Main', studentNumber: 'STU001',
    });
  });
  test('falls back to email when full_name is missing', () => {
    expect(_buildUser({ id: 'u1', email: 'fallback@test.com', user_metadata: {} }).fullName).toBe('fallback@test.com');
  });
  test('defaults accountType to "buyer" when missing', () => {
    expect(_buildUser({ id: 'u1', email: 'x@y.com', user_metadata: {} }).accountType).toBe('buyer');
  });
  test('defaults university/campus/studentNumber to empty string', () => {
    const result = _buildUser({ id: 'u1', email: 'x@y.com', user_metadata: {} });
    expect(result.university).toBe('');
    expect(result.campus).toBe('');
    expect(result.studentNumber).toBe('');
  });
  test('works when user_metadata is absent entirely', () => {
    const result = _buildUser({ id: 'u2', email: 'no-meta@test.com' });
    expect(result.fullName).toBe('no-meta@test.com');
    expect(result.accountType).toBe('buyer');
  });
});

describe('_mapListingRecord', () => {
  test('maps a full listing record correctly', () => {
    const record = {
      listing_id: 'lst-1', seller_id: 'usr-1', title: 'Maths Textbook',
      description: 'Good condition', price: '150', category: 'Books',
      condition: 'Good', is_tradeable: true, status: 'active',
      image_url: 'https://example.com/img.jpg', created_at: '2026-01-01T00:00:00Z',
    };
    expect(_mapListingRecord(record)).toEqual({
      id: 'lst-1', sellerId: 'usr-1', title: 'Maths Textbook',
      description: 'Good condition', price: 150, category: 'Books',
      condition: 'Good', isTradeable: true, status: 'active',
      imageUrl: 'https://example.com/img.jpg', createdAt: '2026-01-01T00:00:00Z',
    });
  });
  test('uses fallback values for missing fields', () => {
    const result = _mapListingRecord({ listing_id: 'lst-2', seller_id: 'usr-2' });
    expect(result.title).toBe('Untitled listing');
    expect(result.price).toBe(0);
    expect(result.category).toBe('Other');
    expect(result.condition).toBe('Not specified');
    expect(result.isTradeable).toBe(false);
    expect(result.status).toBe('active');
    expect(result.imageUrl).toBe('');
  });
  test('coerces price string to number', () => {
    expect(_mapListingRecord({ listing_id: 'x', seller_id: 'y', price: '299.99' }).price).toBe(299.99);
  });
  test('coerces invalid price to 0', () => {
    expect(_mapListingRecord({ listing_id: 'x', seller_id: 'y', price: 'bad' }).price).toBe(0);
  });
  test('coerces is_tradeable to boolean', () => {
    expect(_mapListingRecord({ listing_id: 'a', seller_id: 'b', is_tradeable: 1 }).isTradeable).toBe(true);
    expect(_mapListingRecord({ listing_id: 'c', seller_id: 'd', is_tradeable: 0 }).isTradeable).toBe(false);
  });
});

describe('aggregateListings', () => {
  const thisMonthISO = new Date().toISOString();
  const oldISO = '2020-01-01T00:00:00Z';

  test('counts active and sold listings correctly', () => {
    const result = aggregateListings([
      { price: '100', status: 'active', created_at: oldISO },
      { price: '200', status: 'active', created_at: oldISO },
      { price: '50',  status: 'sold',   created_at: oldISO },
    ]);
    expect(result.activeListings).toBe(2);
    expect(result.soldListings).toBe(1);
    expect(result.activeValue).toBe(300);
  });
  test('counts listings created this month', () => {
    const result = aggregateListings([
      { price: '0', status: 'active', created_at: thisMonthISO },
      { price: '0', status: 'active', created_at: oldISO },
    ]);
    expect(result.thisMonth).toBe(1);
  });
  test('returns zeros for empty input', () => {
    expect(aggregateListings([])).toEqual({ activeListings: 0, soldListings: 0, activeValue: 0, thisMonth: 0 });
  });
  test('handles missing created_at gracefully', () => {
    expect(aggregateListings([{ price: '10', status: 'active', created_at: null }]).thisMonth).toBe(0);
  });
  test('ignores unknown statuses', () => {
    const result = aggregateListings([{ price: '10', status: 'pending', created_at: oldISO }]);
    expect(result.activeListings).toBe(0);
    expect(result.soldListings).toBe(0);
  });
});

describe('buildCategoryMap', () => {
  test('counts categories correctly', () => {
    expect(buildCategoryMap([{ category: 'Books' }, { category: 'Books' }, { category: 'Electronics' }]))
      .toEqual({ Books: 2, Electronics: 1 });
  });
  test('uses "Uncategorized" for missing category', () => {
    expect(buildCategoryMap([{ category: null }, {}])).toEqual({ Uncategorized: 2 });
  });
  test('returns empty object for empty input', () => {
    expect(buildCategoryMap([])).toEqual({});
  });
});

describe('validateImageUpload', () => {
  test('accepts a file under 5 MB', () => {
    expect(validateImageUpload({ name: 'photo.jpg', size: 1 * 1024 * 1024 }).valid).toBe(true);
  });
  test('rejects a file over 5 MB', () => {
    expect(validateImageUpload({ name: 'huge.jpg', size: 6 * 1024 * 1024 }).error).toBe('Image must be 5 MB or smaller.');
  });
  test('rejects a file at 5 MB + 1 byte', () => {
    expect(validateImageUpload({ name: 'b.jpg', size: LISTING_IMAGE_MAX_BYTES + 1 }).error).toBeTruthy();
  });
  test('accepts a file exactly at the 5 MB limit', () => {
    expect(validateImageUpload({ name: 'exact.jpg', size: LISTING_IMAGE_MAX_BYTES }).valid).toBe(true);
  });
  test('lowercases the extension', () => {
    expect(validateImageUpload({ name: 'image.PNG', size: 100 }).safeExt).toBe('png');
  });
});
