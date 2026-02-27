import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bejyrfgyzlfrnzaxzqyx.supabase.co';
const supabaseKey = 'sb_publishable_Vb_oRWmU7BToU0QiDTV1Gw_6EnJc4ml';

export const supabase = createClient(supabaseUrl, supabaseKey);
