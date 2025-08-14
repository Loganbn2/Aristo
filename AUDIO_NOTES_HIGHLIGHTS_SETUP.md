# Audio for Notes and Highlights - Implementation Guide

This document explains how to add audio functionality to both notes and highlights in the Aristo application, allowing users to listen to their content using AI-generated speech.

## Overview

The audio functionality allows users to:
- **Listen to highlights**: Click an audio button in any highlight bubble to hear the highlight content read aloud
- **Listen to notes**: Click an audio button in note details to hear both the selected text and the note content
- **Preview selected text**: Use an audio button in the note creation modal to hear the selected text before saving

## Files Added/Modified

### Database Changes
1. **`add_audio_to_notes_highlights.sql`** - SQL script to add audio columns to notes and highlights tables
   - Adds `audio_data`, `audio_voice`, `audio_model`, `audio_generated_at` columns to both tables
   - Creates indexes and triggers for audio management

### JavaScript Files
1. **`static/js/audio-utility.js`** - Core audio functionality
   - Handles audio generation using OpenAI TTS API
   - Manages caching and database storage
   - Provides play/pause controls for individual audio items

2. **`static/js/audio-ui-helper.js`** - UI integration
   - Adds audio buttons to highlights, notes, and modals
   - Handles button states (play, pause, loading)
   - Provides visual feedback during audio generation

### Database Service Updates
1. **`static/js/database.js`** - Added new methods:
   - `getNoteAudio(noteId, voice, model)` - Retrieve note audio from database
   - `saveNoteAudio(noteId, audioData, voice, model)` - Save note audio to database
   - `getHighlightAudio(highlightId, voice, model)` - Retrieve highlight audio from database
   - `saveHighlightAudio(highlightId, audioData, voice, model)` - Save highlight audio to database

### UI Integration
1. **`static/js/app.js`** - Modified existing methods:
   - `showTextBubble()` - Adds audio button to highlight bubbles
   - `showNoteDetails()` - Adds audio button to note detail bubbles
   - `openNoteModal()` - Adds preview audio button to note creation modal

2. **`static/css/audio-ui.css`** - Styling for audio buttons and controls
3. **`templates/index.html`** - Added script includes for new audio files

## Setup Instructions

### 1. Database Setup
Run the SQL script to add audio columns to your Supabase database:

```sql
-- Run the contents of add_audio_to_notes_highlights.sql in your Supabase SQL editor
```

### 2. Verify Dependencies
Ensure you have the OpenAI API configured in your application (same setup as the chapter audiobook feature).

### 3. Test the Feature
1. **Test Highlight Audio**:
   - Ask Aristo a question about a chapter and save the response as a highlight
   - Click on the highlight in the text to open the bubble
   - You should see a "Listen to Highlight" button
   - Click it to hear the highlight content

2. **Test Note Audio**:
   - Select text and create a note
   - Click on a note indicator to view note details
   - You should see a "Listen to Note" button
   - Click it to hear both the selected text and your note

3. **Test Note Modal Audio**:
   - Select text to create a new note
   - In the note creation modal, you should see a "Listen to Selected Text" button
   - Click it to preview the selected text as audio

## How It Works

### Audio Generation
1. When a user clicks an audio button, the system:
   - Checks if audio already exists in the database (with current voice/model settings)
   - If found, loads and plays the cached audio
   - If not found, generates new audio using OpenAI TTS API
   - Saves the generated audio to the database for future use

### Caching Strategy
- **Local Cache**: Audio objects are cached in memory for the current session
- **Database Cache**: Base64-encoded audio data is stored in the database
- **Cache Keys**: Based on item ID, voice setting, and model setting

### Audio Settings
The audio uses the same voice and model settings as the chapter audiobook feature:
- **Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Models**: tts-1 (standard) or tts-1-hd (high definition)
- **Settings**: Stored in localStorage and shared with the audiobook reader

## Technical Details

### Audio Utility Class
The `AudioUtility` class provides:
- `generateNoteAudio(noteId, content)` - Generate audio for a note
- `generateHighlightAudio(highlightId, content)` - Generate audio for a highlight
- Audio playback controls (play, pause, stop)
- Settings management and caching

### UI Helper Class
The `AudioUIHelper` class provides:
- `addHighlightAudioButton()` - Add audio button to highlight bubbles
- `addNoteAudioButton()` - Add audio button to note details
- `addNoteModalAudioButton()` - Add preview button to note modal
- Button state management and visual feedback

### Database Integration
New database methods handle:
- Storing/retrieving audio data as base64-encoded strings
- Managing audio metadata (voice, model, generation timestamp)
- Efficient querying with proper indexes

## Error Handling

The system includes comprehensive error handling for:
- **Network Issues**: Graceful fallbacks when API calls fail
- **Audio Errors**: User-friendly messages for playback problems
- **Missing Dependencies**: Checks for required services before attempting operations
- **Database Errors**: Continues to work even if database storage fails

## Performance Considerations

- **Lazy Loading**: Audio is only generated when requested
- **Efficient Caching**: Once generated, audio is cached at multiple levels
- **Background Processing**: Audio generation doesn't block the UI
- **Memory Management**: Proper cleanup of audio objects and URLs

## User Experience

### Visual Feedback
- **Loading States**: Spinner animations during audio generation
- **Button States**: Clear play/pause/stop button indicators
- **Hover Effects**: Subtle animations for better interaction feedback

### Audio Controls
- **Play/Pause**: Toggle between play and pause states
- **Auto-stop**: Only one audio item plays at a time
- **Duration Display**: Shows audio length for longer content

## Troubleshooting

### Common Issues
1. **No Audio Button Appears**: Check browser console for JavaScript errors
2. **Audio Generation Fails**: Verify OpenAI API key is configured
3. **Database Errors**: Check Supabase permissions and table structure
4. **Playback Issues**: Ensure browser allows autoplay or user interaction

### Debug Tools
- Check browser console for detailed logging
- Verify database tables have the new audio columns
- Test with different voice/model combinations
- Check network requests to the TTS API

## Future Enhancements

Possible improvements to consider:
- **Speed Controls**: Allow users to adjust playback speed
- **Voice Selection**: Per-item voice preferences
- **Bulk Generation**: Pre-generate audio for multiple items
- **Offline Support**: Download audio for offline listening
- **Accessibility**: Enhanced keyboard navigation and screen reader support
