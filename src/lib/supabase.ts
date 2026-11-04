import { createClient, User } from '@supabase/supabase-js';

// Sanitize Supabase URL (strip /rest/v1 and trailing slashes if accidentally entered in Render / Vercel)
const rawUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://placeholder.supabase.co'
).trim();

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'placeholder-anon-key'
).trim();

export const isSupabaseConfigured = (): boolean => {
  return (
    supabaseUrl !== '' &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== '' &&
    supabaseAnonKey !== 'placeholder-anon-key'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export const extractGoogleProfile = (user: User | null): GoogleUserProfile | null => {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user.email?.split('@')[0] ||
    'Google Player';

  // Google avatar is stored in avatar_url or picture
  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

  return {
    id: user.id,
    name,
    email: user.email || '',
    avatarUrl,
  };
};

export const signInWithGoogle = async (redirectPath: string = '/'): Promise<void> => {
  if (!isSupabaseConfigured()) {
    if (typeof window !== 'undefined') {
      alert(
        '⚠️ ยังไม่ได้ตั้งค่า Environment Variables บน Render!\n\nกรุณาไปที่ Render Dashboard -> แถบ Environment แล้วเพิ่มตัวแปร:\n1. NEXT_PUBLIC_SUPABASE_URL\n2. NEXT_PUBLIC_SUPABASE_ANON_KEY\n\nจากนั้นกด Manual Deploy -> Clear build cache & deploy ครับ'
      );
    }
    return;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}${redirectPath}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error && typeof window !== 'undefined') {
    alert(
      `เข้าสู่ระบบไม่สำเร็จ: ${error.message}\n\nกรุณาตรวจสอบว่าได้เพิ่ม URL ของ Render ใน Supabase -> Authentication -> URL Configuration หรือยังครับ`
    );
  }
};

export const signOutGoogle = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
};
