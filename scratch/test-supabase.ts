import { supabase, isSupabaseConfigured } from '../src/lib/supabase';

async function testSupabase() {
  console.log('isSupabaseConfigured:', isSupabaseConfigured());
  if (!isSupabaseConfigured()) {
    console.log('Supabase is not configured locally in .env.local');
    return;
  }
  const { data, error } = await supabase.from('poker_rooms').select('*').limit(1);
  console.log('poker_rooms query:', { data, error });
}

testSupabase();

