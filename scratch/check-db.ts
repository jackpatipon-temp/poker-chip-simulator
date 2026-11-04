import { createClient } from '@supabase/supabase-js';

const url = 'https://uyrpmzdbwiezbfzytxjk.supabase.co';
const key = 'sb_publishable_NgfqpDqqsGAKOH_Txhq_cg_Swaz9c8Y';
const client = createClient(url, key);

async function check() {
  const { data, error } = await client.from('rooms').select('*').limit(1);
  console.log('rooms:', { data, error });
}

check();

