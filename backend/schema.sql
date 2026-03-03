-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  email TEXT,
  username TEXT NOT NULL,
  avatar_url TEXT,
  skill_score INTEGER DEFAULT 0 CHECK (skill_score >= 0 AND skill_score <= 100),
  streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
  last_active DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Mistakes table
CREATE TABLE IF NOT EXISTS mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  mistake_type TEXT NOT NULL CHECK (mistake_type IN ('antipattern', 'bug', 'security', 'performance', 'style')),
  concept_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  original_code TEXT NOT NULL,
  line_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_id ON mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_concept_id ON mistakes(concept_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_created_at ON mistakes(created_at DESC);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mistake_id UUID REFERENCES mistakes(id) ON DELETE SET NULL,
  concept_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  code_before TEXT NOT NULL,
  code_after TEXT NOT NULL,
  diagram_syntax TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);

-- Learning profiles table
CREATE TABLE IF NOT EXISTS learning_profiles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  lessons_completed INTEGER DEFAULT 0 CHECK (lessons_completed >= 0),
  overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  weak_areas JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, language)
);

CREATE INDEX IF NOT EXISTS idx_learning_profiles_user_id ON learning_profiles(user_id);

-- Concept embeddings table
CREATE TABLE IF NOT EXISTS concept_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concept_embeddings_concept_id ON concept_embeddings(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_embeddings_embedding ON concept_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Match concepts RPC function
CREATE OR REPLACE FUNCTION match_concepts(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  concept_id TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.concept_id,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM concept_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
