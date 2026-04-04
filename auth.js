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
/* ---------- sign-up ---------- */
async function signUp({
fullName, email, password, accountType,
university, campus, studentNumber
}) {
const { error } = await _sb.auth.signUp({
email,
password,
options: {
data: {
full_name: fullName,
account_type: accountType,
university: university || null,
campus: campus || null,
student_number: studentNumber || null,
}
}
});
if (error) return { error: error.message };
return { success: true };
}
/* ---------- sign-in ---------- */
async function signIn({ email, password }) {
const { data, error } =
await _sb.auth.signInWithPassword({ email, password });
if (error) return { error: error.message };
return { success: true, user: _buildUser(data.user) };
}
/* ---------- sign-out ---------- */
async function signOut() {
await _sb.auth.signOut();
window.location.href = 'login.html';
}
/* ---------- helper ---------- */
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