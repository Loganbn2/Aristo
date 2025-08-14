/**
 * Audio utility for notes and highlights
 * Handles audio generation, caching, and playback for individual notes and highlights
 */
class AudioUtility {
    constructor() {
        this.audioCache = new Map(); // Cache for generated audio
        this.settings = {
            voice: 'alloy', // alloy, echo, fable, onyx, nova, shimmer
            model: 'tts-1', // tts-1 or tts-1-hd
            volume: 0.8,
            playbackRate: 1.0
        };
        this.currentlyPlaying = null; // Track currently playing audio
        this.aiAudioEnabled = false;
        
        this.init();
    }

    async init() {
        await this.checkAIAvailability();
        this.loadAudioSettings();
    }

    async checkAIAvailability() {
        try {
            console.log(`🔍 AudioUtility: Checking AI availability...`);
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.aiAudioEnabled = config.features?.ai_audio_enabled || false;
            console.log(`🔍 AudioUtility: AI audio enabled:`, this.aiAudioEnabled);
            
            return this.aiAudioEnabled;
        } catch (error) {
            console.error('❌ AudioUtility: Error checking AI availability:', error);
            this.aiAudioEnabled = false;
            return false;
        }
    }

    loadAudioSettings() {
        try {
            const saved = localStorage.getItem('aristoAudioSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.settings = { ...this.settings, ...settings };
            }
        } catch (error) {
            console.warn('⚠️ AudioUtility: Could not load audio settings:', error);
        }
    }

    saveAudioSettings() {
        try {
            localStorage.setItem('aristoAudioSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('⚠️ AudioUtility: Could not save audio settings:', error);
        }
    }

    /**
     * Generate audio for a note
     * @param {string} noteId - The note ID
     * @param {string} content - The note content to convert to audio
     * @returns {Promise<Object|null>} Audio object with play method
     */
    async generateNoteAudio(noteId, content) {
        if (!this.aiAudioEnabled) {
            console.warn('❌ AudioUtility: AI audio not enabled');
            return null;
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            console.warn('❌ AudioUtility: Invalid content for note audio generation');
            return null;
        }

        console.log(`🎤 AudioUtility: Generating audio for note ${noteId}`);
        console.log(`🎤 AudioUtility: Note content preview:`, content.substring(0, 100) + '...');
        console.log(`🎤 AudioUtility: Current voice/model:`, this.settings.voice, this.settings.model);

        try {
            // Check if we already have cached audio for current settings
            const currentCacheKey = `note-${noteId}-${this.settings.voice}-${this.settings.model}`;
            console.log(`🗄️ AudioUtility: Checking cache with key:`, currentCacheKey);
            if (this.audioCache.has(currentCacheKey)) {
                console.log(`✅ AudioUtility: Found cached note audio (current voice/model)`);
                return this.audioCache.get(currentCacheKey);
            }

            // Check if we have cached audio from any voice/model combination
            const anyCacheKey = Array.from(this.audioCache.keys()).find(key => 
                key.startsWith(`note-${noteId}-`)
            );
            if (anyCacheKey) {
                console.log(`✅ AudioUtility: Found cached note audio (any voice/model): ${anyCacheKey}`);
                const cachedAudio = this.audioCache.get(anyCacheKey);
                // Store under current cache key as well for faster access
                this.audioCache.set(currentCacheKey, cachedAudio);
                return cachedAudio;
            }

            // Check database for existing audio (any voice/model)
            console.log(`🗄️ AudioUtility: Checking database for note ${noteId}...`);
            console.log(`🗄️ AudioUtility: DatabaseService available:`, typeof DatabaseService !== 'undefined');
            
            if (typeof DatabaseService === 'undefined') {
                console.error('❌ AudioUtility: DatabaseService not available!');
            } else {
                console.log(`🗄️ AudioUtility: Calling DatabaseService.getNoteAudio...`);
                const existingAudio = await DatabaseService.getNoteAudio(noteId, this.settings.voice, this.settings.model);
                console.log(`🗄️ AudioUtility: Database query result:`, existingAudio);
                
                if (existingAudio && existingAudio.audio_data) {
                    console.log(`✅ AudioUtility: Found note audio in database (voice: ${existingAudio.audio_voice}, model: ${existingAudio.audio_model})`);
                    const audioObject = await this.createAudioFromBase64(existingAudio.audio_data, content);
                    if (audioObject) {
                        // Cache under both the found voice/model and current voice/model keys
                        const foundCacheKey = `note-${noteId}-${existingAudio.audio_voice}-${existingAudio.audio_model}`;
                        this.audioCache.set(foundCacheKey, audioObject);
                        this.audioCache.set(currentCacheKey, audioObject);
                        return audioObject;
                    } else {
                        console.warn(`⚠️ AudioUtility: Failed to create audio object from database data`);
                    }
                } else {
                    console.log(`📭 AudioUtility: No existing note audio found in database`);
                }
            }

            console.log(`🎙️ AudioUtility: No existing audio found, generating new audio for note ${noteId}`);

            // Generate new audio
            const audioBlob = await this.generateSegmentAudio(content);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioElement = new Audio(audioUrl);
            
            // Wait for audio metadata to load
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);
                
                audioElement.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                audioElement.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                });
                audioElement.load();
            });

            const audioObject = {
                audio: audioElement,
                url: audioUrl,
                blob: audioBlob,
                duration: audioElement.duration,
                text: content,
                play: () => this.playAudio(audioElement),
                pause: () => this.pauseAudio(audioElement),
                stop: () => this.stopAudio(audioElement)
            };

            // Cache the audio object
            this.audioCache.set(currentCacheKey, audioObject);

            // Save to database
            try {
                console.log(`💾 AudioUtility: Saving note audio to database...`);
                const base64Data = await this.blobToBase64(audioBlob);
                const saveResult = await DatabaseService.saveNoteAudio(noteId, base64Data, this.settings.voice, this.settings.model);
                console.log(`💾 AudioUtility: Save result:`, saveResult);
                if (saveResult) {
                    console.log(`✅ AudioUtility: Saved note audio to database`);
                } else {
                    console.warn(`⚠️ AudioUtility: Failed to save note audio to database`);
                }
            } catch (saveError) {
                console.warn('⚠️ AudioUtility: Could not save note audio to database:', saveError);
            }

            return audioObject;

        } catch (error) {
            console.error('❌ AudioUtility: Error generating note audio:', error);
            return null;
        }
    }

    /**
     * Generate audio for a highlight
     * @param {string} highlightId - The highlight ID
     * @param {string} content - The highlight content or selected text to convert to audio
     * @returns {Promise<Object|null>} Audio object with play method
     */
    async generateHighlightAudio(highlightId, content) {
        if (!this.aiAudioEnabled) {
            console.warn('❌ AudioUtility: AI audio not enabled');
            return null;
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            console.warn('❌ AudioUtility: Invalid content for highlight audio generation');
            return null;
        }

        console.log(`🎤 AudioUtility: Generating audio for highlight ${highlightId}`);

        try {
            // Check if we already have cached audio for current settings
            const currentCacheKey = `highlight-${highlightId}-${this.settings.voice}-${this.settings.model}`;
            if (this.audioCache.has(currentCacheKey)) {
                console.log(`✅ AudioUtility: Found cached highlight audio (current voice/model)`);
                return this.audioCache.get(currentCacheKey);
            }

            // Check if we have cached audio from any voice/model combination
            const anyCacheKey = Array.from(this.audioCache.keys()).find(key => 
                key.startsWith(`highlight-${highlightId}-`)
            );
            if (anyCacheKey) {
                console.log(`✅ AudioUtility: Found cached highlight audio (any voice/model): ${anyCacheKey}`);
                const cachedAudio = this.audioCache.get(anyCacheKey);
                // Store under current cache key as well for faster access
                this.audioCache.set(currentCacheKey, cachedAudio);
                return cachedAudio;
            }

            // Check database for existing audio (any voice/model)
            const existingAudio = await DatabaseService.getHighlightAudio(highlightId, this.settings.voice, this.settings.model);
            if (existingAudio && existingAudio.audio_data) {
                console.log(`✅ AudioUtility: Found highlight audio in database (voice: ${existingAudio.audio_voice}, model: ${existingAudio.audio_model})`);
                const audioObject = await this.createAudioFromBase64(existingAudio.audio_data, content);
                if (audioObject) {
                    // Cache under both the found voice/model and current voice/model keys
                    const foundCacheKey = `highlight-${highlightId}-${existingAudio.audio_voice}-${existingAudio.audio_model}`;
                    this.audioCache.set(foundCacheKey, audioObject);
                    this.audioCache.set(currentCacheKey, audioObject);
                    return audioObject;
                }
            }

            console.log(`🎙️ AudioUtility: No existing audio found, generating new audio for highlight ${highlightId}`);

            // Generate new audio
            const audioBlob = await this.generateSegmentAudio(content);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioElement = new Audio(audioUrl);
            
            // Wait for audio metadata to load
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);
                
                audioElement.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                audioElement.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                });
                audioElement.load();
            });

            const audioObject = {
                audio: audioElement,
                url: audioUrl,
                blob: audioBlob,
                duration: audioElement.duration,
                text: content,
                play: () => this.playAudio(audioElement),
                pause: () => this.pauseAudio(audioElement),
                stop: () => this.stopAudio(audioElement)
            };

            // Cache the audio object
            this.audioCache.set(currentCacheKey, audioObject);

            // Save to database
            try {
                const base64Data = await this.blobToBase64(audioBlob);
                await DatabaseService.saveHighlightAudio(highlightId, base64Data, this.settings.voice, this.settings.model);
                console.log(`✅ AudioUtility: Saved highlight audio to database`);
            } catch (saveError) {
                console.warn('⚠️ AudioUtility: Could not save highlight audio to database:', saveError);
            }

            return audioObject;

        } catch (error) {
            console.error('❌ AudioUtility: Error generating highlight audio:', error);
            return null;
        }
    }

    /**
     * Create audio object from base64 data
     * @private
     */
    async createAudioFromBase64(base64Data, content) {
        try {
            // Handle different formats of audio data from database
            let audioData;
            
            if (typeof base64Data === 'string') {
                // Check if it's JSON-encoded base64 or direct base64
                try {
                    // Try parsing as JSON first (for new format)
                    const parsed = JSON.parse(base64Data);
                    if (typeof parsed === 'string') {
                        audioData = parsed;
                    } else {
                        // If parsed result is not a string, use the original
                        audioData = base64Data;
                    }
                } catch (parseError) {
                    // Not JSON, treat as direct base64 string
                    audioData = base64Data;
                }
            } else {
                // Convert to string if not already
                audioData = JSON.stringify(base64Data);
            }

            console.log(`🔄 AudioUtility: Processing base64 data (${audioData.length} chars)`);

            const blob = this.base64ToBlob(audioData, 'audio/mp3');
            const audioUrl = URL.createObjectURL(blob);
            const audioElement = new Audio(audioUrl);

            // Wait for metadata
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);
                
                audioElement.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                audioElement.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                });
                audioElement.load();
            });

            console.log(`✅ AudioUtility: Successfully created audio from database (duration: ${audioElement.duration}s)`);

            return {
                audio: audioElement,
                url: audioUrl,
                blob: blob,
                duration: audioElement.duration,
                text: content,
                play: () => this.playAudio(audioElement),
                pause: () => this.pauseAudio(audioElement),
                stop: () => this.stopAudio(audioElement)
            };
        } catch (error) {
            console.error('❌ AudioUtility: Error creating audio from base64:', error);
            return null;
        }
    }

    /**
     * Generate audio using the TTS API
     * @private
     */
    async generateSegmentAudio(text) {
        try {
            console.log(`🎙️ AudioUtility: Generating audio for text (${text.length} chars)`);
            
            const voice = typeof this.settings.voice === 'string' && this.settings.voice ? this.settings.voice : 'alloy';
            const model = typeof this.settings.model === 'string' && this.settings.model ? this.settings.model : 'tts-1';
            
            const requestBody = {
                text: text,
                voice: voice,
                model: model
            };
            
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Failed to generate audio`);
            }

            if (!data.success || !data.audio_data) {
                throw new Error(data.error || 'No audio data received from server');
            }

            // Convert base64 to blob
            const audioBlob = this.base64ToBlob(data.audio_data, 'audio/mp3');
            return audioBlob;
            
        } catch (error) {
            console.error('❌ AudioUtility: Error in generateSegmentAudio:', error);
            throw error;
        }
    }

    /**
     * Convert base64 to blob
     * @private
     */
    base64ToBlob(base64, mimeType) {
        try {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        } catch (error) {
            console.error('❌ AudioUtility: Error converting base64 to blob:', error);
            throw new Error('Failed to process audio data');
        }
    }

    /**
     * Convert blob to base64
     * @private
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1]; // Remove data:audio/mp3;base64, prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Play audio with proper settings
     * @private
     */
    async playAudio(audioElement) {
        try {
            // Stop any currently playing audio
            if (this.currentlyPlaying && this.currentlyPlaying !== audioElement) {
                this.currentlyPlaying.pause();
                this.currentlyPlaying.currentTime = 0;
            }

            // Pause main audiobook when highlight/note audio is played
            if (typeof window.audiobookReader !== 'undefined' && window.audiobookReader) {
                if (window.audiobookReader.isPlaying) {
                    console.log('⏸️ AudioUtility: Pausing main audiobook for highlight/note audio');
                    window.audiobookReader.pauseAudio();
                }
            }

            // Apply settings
            audioElement.volume = this.settings.volume;
            audioElement.playbackRate = this.settings.playbackRate;

            // Track current audio
            this.currentlyPlaying = audioElement;

            // Play the audio
            await audioElement.play();
            console.log(`▶️ AudioUtility: Audio playback started`);

            // Set up ended event listener
            audioElement.addEventListener('ended', () => {
                if (this.currentlyPlaying === audioElement) {
                    this.currentlyPlaying = null;
                }
            });

        } catch (error) {
            console.error('❌ AudioUtility: Error playing audio:', error);
        }
    }

    /**
     * Pause audio
     * @private
     */
    pauseAudio(audioElement) {
        try {
            audioElement.pause();
            console.log(`⏸️ AudioUtility: Audio playback paused`);
        } catch (error) {
            console.error('❌ AudioUtility: Error pausing audio:', error);
        }
    }

    /**
     * Stop audio
     * @private
     */
    stopAudio(audioElement) {
        try {
            audioElement.pause();
            audioElement.currentTime = 0;
            if (this.currentlyPlaying === audioElement) {
                this.currentlyPlaying = null;
            }
            console.log(`⏹️ AudioUtility: Audio playback stopped`);
        } catch (error) {
            console.error('❌ AudioUtility: Error stopping audio:', error);
        }
    }

    /**
     * Stop all currently playing audio
     */
    stopAll() {
        if (this.currentlyPlaying) {
            this.stopAudio(this.currentlyPlaying);
        }
    }

    /**
     * Clear audio cache
     */
    clearCache() {
        // Clean up object URLs to prevent memory leaks
        for (const [key, audioObject] of this.audioCache) {
            if (audioObject.url) {
                URL.revokeObjectURL(audioObject.url);
            }
        }
        this.audioCache.clear();
        console.log('🗑️ AudioUtility: Cache cleared');
    }

    /**
     * Update audio settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveAudioSettings();
        console.log('⚙️ AudioUtility: Settings updated:', this.settings);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
}

// Create global instance
window.AudioUtility = window.AudioUtility || new AudioUtility();
