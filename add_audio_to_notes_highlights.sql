-- Add audio columns to notes table
ALTER TABLE notes 
ADD COLUMN audio_data TEXT, -- Base64 encoded audio data
ADD COLUMN audio_voice VARCHAR(50), -- Voice used (alloy, echo, fable, etc.)
ADD COLUMN audio_model VARCHAR(50), -- Model used (tts-1, tts-1-hd)
ADD COLUMN audio_generated_at TIMESTAMP WITH TIME ZONE; -- When audio was generated

-- Add audio columns to highlights table
ALTER TABLE highlights 
ADD COLUMN audio_data TEXT, -- Base64 encoded audio data
ADD COLUMN audio_voice VARCHAR(50), -- Voice used (alloy, echo, fable, etc.)
ADD COLUMN audio_model VARCHAR(50), -- Model used (tts-1, tts-1-hd)
ADD COLUMN audio_generated_at TIMESTAMP WITH TIME ZONE; -- When audio was generated

-- Add indexes for audio queries
CREATE INDEX IF NOT EXISTS idx_notes_audio ON notes(audio_voice, audio_model) WHERE audio_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_highlights_audio ON highlights(audio_voice, audio_model) WHERE audio_data IS NOT NULL;

-- Update trigger for notes audio timestamp
CREATE OR REPLACE FUNCTION update_notes_audio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update audio_generated_at when audio_data is changed
    IF NEW.audio_data IS DISTINCT FROM OLD.audio_data AND NEW.audio_data IS NOT NULL THEN
        NEW.audio_generated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_notes_audio_timestamp
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_notes_audio_timestamp();

-- Update trigger for highlights audio timestamp
CREATE OR REPLACE FUNCTION update_highlights_audio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update audio_generated_at when audio_data is changed
    IF NEW.audio_data IS DISTINCT FROM OLD.audio_data AND NEW.audio_data IS NOT NULL THEN
        NEW.audio_generated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_highlights_audio_timestamp
    BEFORE UPDATE ON highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_highlights_audio_timestamp();
