import { createClient } from '@supabase/supabase-js';

// Configuration based on user request
const SUPABASE_URL = 'https://nvukznijjllgyuyrswhy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_C3QyvlDHZRSidZWtbE2k3g_47ldrdW_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);