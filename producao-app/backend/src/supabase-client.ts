/**
 * supabase-client.ts
 * Cliente Supabase para acesso ao banco PostgreSQL
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados. Usando SQLite local.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Helper para queries
export async function sbQuery(table: string, select = '*', filters?: Record<string, any>) {
  let query = supabase.from(table).select(select);
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function sbInsert(table: string, data: any) {
  const { data: result, error } = await supabase.from(table).insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function sbUpdate(table: string, id: number | string, data: any) {
  const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

export async function sbDelete(table: string, id: number | string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}
