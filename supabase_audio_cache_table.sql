-- Create audio cache table for storing generated AI audio
CREATE TABLE IF NOT EXISTS audio_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key VARCHAR(500) NOT NULL UNIQUE,
    audio_data TEXT NOT NULL, -- Base64 encoded audio data (JSON array)
    voice VARCHAR(50) NOT NULL, -- Voice used (alloy, echo, fable, etc.)
    model VARCHAR(50) NOT NULL, -- Model used (tts-1, tts-1-hd)
    text_hash VARCHAR(64), -- Optional hash of the text for integrity checking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audio_cache_key ON audio_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_audio_cache_voice_model ON audio_cache(voice, model);
CREATE INDEX IF NOT EXISTS idx_audio_cache_created ON audio_cache(created_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE audio_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (adjust based on your authentication needs)
CREATE POLICY "Allow all audio cache operations" ON audio_cache FOR ALL USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audio_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_audio_cache_updated_at
    BEFORE UPDATE ON audio_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_audio_cache_updated_at();
