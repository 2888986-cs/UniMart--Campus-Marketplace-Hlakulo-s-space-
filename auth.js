/**
* UniMart — Auth module (Supabase)
* Phase 1: client setup only
*/
const SUPABASE_URL = 'https://xdxnzkowvmphveiwzufm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WqqtaVhge6rIPosltnGktw_xVHBE5L_';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const Auth = (() => {
// stubs — implementations added in later commits
function getUserInitials(name) {
if (!name) return '?';
return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
return { getUserInitials };
})();