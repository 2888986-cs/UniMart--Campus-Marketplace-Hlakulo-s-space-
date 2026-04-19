/**
 * Tests for Auth module (auth.js)
 * Supabase is fully mocked so no network calls are made.
 */

// ─── Build a configurable Supabase mock ─────────────────────────────────────

let mockAuthResponse   = { data: {}, error: null };
let mockDbResponse     = { data: null, error: null };
let mockStorageUpload  = { error: null };
let mockStorageUrl     = { data: { publicUrl: 'https://cdn.example.com/img.jpg' } };
let mockSession        = { data: { session: null } };

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockResolvedValue({ error: null }),
  eq:     jest.fn().mockReturnThis(),
  order:  jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(mockDbResponse),
  then:   jest.fn(),
}));

// Make chained calls eventually resolve
const chainedDb = () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue({ error: null }),
    eq:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockResolvedValue(mockDbResponse),
    single: jest.fn().mockResolvedValue(mockDbResponse),
  };
  return chain;
};

const mockStorage = {
  from: jest.fn(() => ({
    upload:       jest.fn().mockResolvedValue(mockStorageUpload),
    getPublicUrl: jest.fn().mockReturnValue(mockStorageUrl),
  })),
};

const mockAuth = {
  signUp:                  jest.fn().mockResolvedValue(mockAuthResponse),
  signInWithPassword:      jest.fn().mockResolvedValue(mockAuthResponse),
  signOut:                 jest.fn().mockResolvedValue({}),
  getSession:              jest.fn().mockResolvedValue(mockSession),
  updateUser:              jest.fn().mockResolvedValue({ error: null }),
  verifyOtp:               jest.fn().mockResolvedValue(mockAuthResponse),
  resetPasswordForEmail:   jest.fn().mockResolvedValue({ error: null }),
};

global.supabase = {
  createClient: jest.fn(() => ({
    auth:    mockAuth,
    from:    jest.fn(() => chainedDb()),
    storage: mockStorage,
  })),
};

global.window = { location: { href: '' } };

// Re-require after mock is set up
const { Auth } = require('../auth.js');

// ─── Helper to reset mocks between tests ────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthResponse  = { data: {}, error: null };
  mockDbResponse    = { data: null, error: null };
  mockSession       = { data: { session: null } };
  global.window.location.href = '';
});

// ═══════════════════════════════════════════════════════════════════════════
// getUserInitials
// ═══════════════════════════════════════════════════════════════════════════

describe('getUserInitials', () => {
  test('returns initials for two-word name', () => {
    expect(Auth.getUserInitials('Joshua Goldberg')).toBe('JG');
  });
  test('returns single initial for one-word name', () => {
    expect(Auth.getUserInitials('Joshua')).toBe('J');
  });
  test('only uses first two words', () => {
    expect(Auth.getUserInitials('Mary Jane Watson')).toBe('MJ');
  });
  test('returns "?" for empty string', () => {
    expect(Auth.getUserInitials('')).toBe('?');
  });
  test('returns "?" for null', () => {
    expect(Auth.getUserInitials(null)).toBe('?');
  });
  test('uppercases result', () => {
    expect(Auth.getUserInitials('alice bob')).toBe('AB');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signUp
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.signUp', () => {
  test('returns success when Supabase returns no error', async () => {
    global.supabase.createClient.mockReturnValue({
      auth: { ...mockAuth, signUp: jest.fn().mockResolvedValue({ error: null }) },
      from: jest.fn(() => chainedDb()),
      storage: mockStorage,
    });
    const { Auth: FreshAuth } = jest.resetModules() || { Auth };
    const result = await Auth.signUp({
      fullName: 'Test User', email: 'test@uni.ac.za', password: 'pass123',
      accountType: 'buyer', university: 'UCT', campus: 'Main', studentNumber: 'S001',
    });
    // signUp calls _sb.auth.signUp — we verify the shape returned
    expect(result).toHaveProperty('success');
  });

  test('returns error when Supabase returns an error', async () => {
    // Temporarily override the mock for this test
    const originalSb = global.supabase;
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, signUp: jest.fn().mockResolvedValue({ error: { message: 'Email taken' } }) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    // Must re-require to get fresh _sb
    jest.resetModules();
    const { Auth: A } = require('../auth.js');
    const result = await A.signUp({ fullName: 'X', email: 'x@y.com', password: 'p', accountType: 'buyer' });
    expect(result.error).toBe('Email taken');
    global.supabase = originalSb;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signIn
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.signIn', () => {
  test('returns success and user on valid credentials', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: {
          ...mockAuth,
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { full_name: 'A B', account_type: 'buyer' } } },
            error: null,
          }),
        },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.signIn({ email: 'a@b.com', password: 'pass' });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('a@b.com');
  });

  test('returns error on invalid credentials', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: {
          ...mockAuth,
          signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login' } }),
        },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.signIn({ email: 'bad@b.com', password: 'wrong' });
    expect(result.error).toBe('Invalid login');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signOut
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.signOut', () => {
  test('redirects to login.html after signing out', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, signOut: jest.fn().mockResolvedValue({}) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    await A.signOut();
    expect(global.window.location.href).toBe('login.html');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// requireAuth
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.requireAuth', () => {
  test('redirects to login.html when no session', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.requireAuth();
    expect(result).toBeNull();
    expect(global.window.location.href).toBe('login.html');
  });

  test('returns user profile when session exists', async () => {
    jest.resetModules();
    const fakeUser = { id: 'u1', email: 'josh@uni.ac.za', user_metadata: { full_name: 'Josh' } };
    const dbChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'u1', full_name: 'Josh', email: 'josh@uni.ac.za', account_type: 'buyer', university: 'UCT', uni_campus: 'Main', student_number: 'S1' },
        error: null,
      }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, getSession: jest.fn().mockResolvedValue({ data: { session: { user: fakeUser } } }) },
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.requireAuth();
    expect(result).not.toBeNull();
    expect(result.fullName).toBe('Josh');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateProfile
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.updateProfile', () => {
  test('returns success when both db and auth update succeed', async () => {
    jest.resetModules();
    const dbChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, updateUser: jest.fn().mockResolvedValue({ error: null }) },
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.updateProfile({ id: 'u1', fullName: 'New Name', email: 'new@uni.ac.za', accountType: 'buyer' });
    expect(result.success).toBe(true);
  });

  test('returns error when db update fails', async () => {
    jest.resetModules();
    const dbChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, updateUser: jest.fn().mockResolvedValue({ error: null }) },
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.updateProfile({ id: 'u1', fullName: 'X', email: 'x@y.com', accountType: 'buyer' });
    expect(result.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updatePassword
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.updatePassword', () => {
  test('returns error when current password is wrong', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, signInWithPassword: jest.fn().mockResolvedValue({ error: { message: 'bad' } }) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.updatePassword({ currentPassword: 'wrong', newPassword: 'new', email: 'x@y.com' });
    expect(result.error).toBe('Incorrect current password.');
  });

  test('returns success when password update succeeds', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: {
          ...mockAuth,
          signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
          updateUser: jest.fn().mockResolvedValue({ error: null }),
        },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.updatePassword({ currentPassword: 'correct', newPassword: 'newpass', email: 'x@y.com' });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// requestPasswordReset
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.requestPasswordReset', () => {
  test('returns success on valid email', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.requestPasswordReset({ email: 'x@y.com', redirectTo: 'https://app.com/reset' });
    expect(result.success).toBe(true);
  });

  test('returns error when reset fails', async () => {
    jest.resetModules();
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: { ...mockAuth, resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { message: 'Not found' } }) },
        from: jest.fn(() => chainedDb()),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.requestPasswordReset({ email: 'bad@y.com', redirectTo: '' });
    expect(result.error).toBe('Not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createListing
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.createListing', () => {
  test('returns success with mapped listing on success', async () => {
    jest.resetModules();
    const fakeRecord = {
      listing_id: 'lst-1', seller_id: 'u1', title: 'Book', description: 'Good',
      price: 100, category: 'Books', condition: 'Good', is_tradeable: false,
      status: 'active', image_url: '', created_at: '2026-01-01T00:00:00Z',
    };
    const dbChain = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeRecord, error: null }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: mockAuth,
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.createListing({
      sellerId: 'u1', title: 'Book', description: 'Good', price: 100,
      category: 'Books', condition: 'Good', isTradeable: false, status: 'active', imageUrl: '',
    });
    expect(result.success).toBe(true);
    expect(result.listing.title).toBe('Book');
  });

  test('returns error when insert fails', async () => {
    jest.resetModules();
    const dbChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: mockAuth,
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.createListing({
      sellerId: 'u1', title: 'Book', description: '', price: 0,
      category: 'Books', condition: 'Good', isTradeable: false, status: 'active', imageUrl: '',
    });
    expect(result.error).toBe('Insert failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteListing
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.deleteListing', () => {
  test('returns success when delete succeeds', async () => {
    jest.resetModules();
    const dbChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: mockAuth,
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.deleteListing({ listingId: 'lst-1', sellerId: 'u1' });
    expect(result.success).toBe(true);
  });

  test('returns error when delete fails', async () => {
    jest.resetModules();
    const dbChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    };
    global.supabase = {
      createClient: jest.fn(() => ({
        auth: mockAuth,
        from: jest.fn(() => dbChain),
        storage: mockStorage,
      })),
    };
    const { Auth: A } = require('../auth.js');
    const result = await A.deleteListing({ listingId: 'lst-1', sellerId: 'u1' });
    expect(result.error).toBe('Delete failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// uploadListingImage
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.uploadListingImage', () => {
  test('rejects files over 5MB', async () => {
    jest.resetModules();
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => chainedDb()), storage: mockStorage })) };
    const { Auth: A } = require('../auth.js');
    const file = { name: 'big.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' };
    const result = await A.uploadListingImage(file, 'u1');
    expect(result.error).toBe('Image must be 5 MB or smaller.');
  });

  test('returns imageUrl on successful upload', async () => {
    jest.resetModules();
    const storageMock = {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/img.jpg' } }),
      })),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => chainedDb()), storage: storageMock })) };
    const { Auth: A } = require('../auth.js');
    const file = { name: 'photo.jpg', size: 1 * 1024 * 1024, type: 'image/jpeg' };
    const result = await A.uploadListingImage(file, 'u1');
    expect(result.success).toBe(true);
    expect(result.imageUrl).toBe('https://cdn.example.com/img.jpg');
  });

  test('returns error when storage upload fails', async () => {
    jest.resetModules();
    const storageMock = {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
        getPublicUrl: jest.fn(),
      })),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => chainedDb()), storage: storageMock })) };
    const { Auth: A } = require('../auth.js');
    const file = { name: 'photo.jpg', size: 1 * 1024 * 1024, type: 'image/jpeg' };
    const result = await A.uploadListingImage(file, 'u1');
    expect(result.error).toBe('Upload failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getMarketplaceListings
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.getMarketplaceListings', () => {
  test('returns mapped listings on success', async () => {
    jest.resetModules();
    const fakeListings = [{
      listing_id: 'l1', seller_id: 'u1', title: 'Laptop', description: 'Fast',
      price: 5000, category: 'Electronics', condition: 'Good', is_tradeable: true,
      status: 'active', image_url: '', created_at: '2026-01-01T00:00:00Z',
    }];
    const dbChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: fakeListings, error: null }),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => dbChain), storage: mockStorage })) };
    const { Auth: A } = require('../auth.js');
    const result = await A.getMarketplaceListings();
    expect(result.success).toBe(true);
    expect(result.listings[0].title).toBe('Laptop');
    expect(result.listings[0].price).toBe(5000);
  });

  test('returns error when query fails', async () => {
    jest.resetModules();
    const dbChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => dbChain), storage: mockStorage })) };
    const { Auth: A } = require('../auth.js');
    const result = await A.getMarketplaceListings();
    expect(result.error).toBe('Query failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateCampusInfo
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth.updateCampusInfo', () => {
  test('returns success when update succeeds', async () => {
    jest.resetModules();
    const dbChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => dbChain), storage: mockStorage })) };
    const { Auth: A } = require('../auth.js');
    const result = await A.updateCampusInfo({ id: 'u1', university: 'UCT', campus: 'Main', studentNumber: 'S1' });
    expect(result.success).toBe(true);
  });

  test('returns error when update fails', async () => {
    jest.resetModules();
    const dbChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    };
    global.supabase = { createClient: jest.fn(() => ({ auth: mockAuth, from: jest.fn(() => dbChain), storage: mockStorage })) };
    const { Auth: A } = require('../auth.js');
    const result = await A.updateCampusInfo({ id: 'u1', university: 'UCT', campus: 'Main', studentNumber: 'S1' });
    expect(result.error).toBe('Update failed');
  });
});
