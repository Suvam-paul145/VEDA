import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface IUser {
  id: string;
  github_id: string;
  email: string | null;
  username: string;
  avatar_url: string | null;
  skill_score: number;
  streak_days: number;
  last_active: string | null;
  created_at: string;
}

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

export async function matchConcepts(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  similarityThreshold: number = 0.75,
  matchCount: number = 2
): Promise<any[]> {
  const { data, error } = await supabase.rpc('match_concepts', {
    query_embedding: queryEmbedding,
    similarity_threshold: similarityThreshold,
    match_count: matchCount
  });

  if (error) {
    console.error('Semantic search failed:', error);
    return [];
  }

  return data || [];
}
