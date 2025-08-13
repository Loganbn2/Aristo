# Aristo AI Audio Caching System

## Overview

The Aristo reading app now includes an intelligent audio caching system that saves generated AI audio to Supabase, dramatically improving performance and user experience.

## Features

- **Persistent Storage**: Generated audio is saved to Supabase and persists across sessions
- **Intelligent Caching**: Audio is cached by book, chapter, voice, and model settings
- **Two-Tier Cache**: Fast local memory cache + persistent cloud storage
- **Automatic Management**: Cache is automatically managed and cleaned up when settings change

## How It Works

### 1. Cache Key Generation
Each audio cache entry has a unique key based on:
- Book title (sanitized)
- Chapter title (sanitized) 
- Chapter ID
- Voice setting (alloy, echo, fable, onyx, nova, shimmer)
- Model setting (tts-1, tts-1-hd)

Example: `the-art-of-reading-chapter-1-the-beginning-1-alloy-tts-1`

### 2. Cache Lookup Process
When a chapter is loaded:
1. Check local memory cache first (fastest)
2. If not found, check Supabase cache (cloud storage)
3. If not found, generate new audio and save to both caches

### 3. Data Storage
- **Local Cache**: Audio elements ready for immediate playback
- **Supabase Cache**: Base64-encoded audio data in JSON format

## Database Schema

```sql
CREATE TABLE audio_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key VARCHAR(500) NOT NULL UNIQUE,
    audio_data TEXT NOT NULL, -- JSON array of base64 audio segments
    voice VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    text_hash VARCHAR(64), -- Optional integrity check
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Create the Database Table
Run the SQL in `supabase_audio_cache_table.sql` in your Supabase SQL Editor, or:

```bash
python3 setup_audio_cache.py
```

### 2. Verify Setup
The setup script will:
- Check if the table exists
- Provide SQL to create it if needed
- Test the functionality once created

## Benefits

- **Faster Loading**: Previously generated audio loads instantly
- **Reduced API Costs**: No need to regenerate the same content
- **Better UX**: No waiting time for repeat visits to chapters
- **Bandwidth Savings**: Audio is generated once and reused
- **Offline Capability**: Cached audio works without internet (after initial generation)

## Cache Management

### Automatic Cleanup
- Cache is cleared when voice or model settings change
- Cache entries are managed by unique keys

### Manual Management
- Clear cache button in audio settings
- Clears both local and cloud cache
- Shows cache statistics (local + cloud counts)

## Technical Details

### Audio Conversion Pipeline
1. Text → OpenAI TTS API → MP3 blob
2. Blob → Base64 encoding → Supabase storage
3. Base64 → Blob → Audio element → Playback

### Error Handling
- Graceful fallback if Supabase is unavailable
- Local cache continues to work independently
- Audio generation proceeds even if caching fails

## Performance Impact

- **First Visit**: Same speed (audio must be generated)
- **Return Visits**: Near-instant loading for cached chapters
- **Memory Usage**: Minimal local storage, efficient cloud storage
- **API Usage**: Reduced OpenAI TTS API calls

## Configuration

No additional configuration needed beyond standard Supabase setup. The system automatically detects Supabase availability and gracefully degrades if unavailable.
