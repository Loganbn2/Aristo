-- Notes table for storing reader annotations
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    selected_text TEXT NOT NULL,
    note_content TEXT NOT NULL,
    note_position JSONB, -- Store position data for the note in the text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_notes_book_chapter ON notes(book_id, chapter_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);

-- Row Level Security (RLS) - Enable it
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for now (since you don't have user authentication yet)
-- This allows anyone to read, insert, update, and delete notes
CREATE POLICY "Allow all operations on notes" ON notes
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Alternative: If you want to be more restrictive, you can create separate policies:
-- CREATE POLICY "Allow read notes" ON notes FOR SELECT USING (true);
-- CREATE POLICY "Allow insert notes" ON notes FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update notes" ON notes FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete notes" ON notes FOR DELETE USING (true);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
