import { createClient } from '@supabase/supabase-js'

//const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
//const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = 'https://eymxpphofhhfeuvaqfad.supabase.co'
const supabaseAnonKey = 'sb_publishable_MxUJ_jmjdv0lMaLHGk3fMg_MBQ0mI70'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)