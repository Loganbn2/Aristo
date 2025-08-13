-- Add audio columns to chapters table
ALTER TABLE chapters 
ADD COLUMN audio_data TEXT, -- Base64 encoded audio data (JSON array)
ADD COLUMN audio_voice VARCHAR(50), -- Voice used (alloy, echo, fable, etc.)
ADD COLUMN audio_model VARCHAR(50), -- Model used (tts-1, tts-1-hd)
ADD COLUMN audio_generated_at TIMESTAMP WITH TIME ZONE; -- When audio was generated

-- Add index for audio queries
CREATE INDEX IF NOT EXISTS idx_chapters_audio ON chapters(audio_voice, audio_model) WHERE audio_data IS NOT NULL;

-- Update trigger to handle audio timestamp
CREATE OR REPLACE FUNCTION update_chapters_audio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update audio_generated_at when audio_data is changed
    IF NEW.audio_data IS DISTINCT FROM OLD.audio_data AND NEW.audio_data IS NOT NULL THEN
        NEW.audio_generated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_chapters_audio_timestamp
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_chapters_audio_timestamp();
