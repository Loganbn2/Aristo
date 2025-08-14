class AudiobookReader {
    constructor(bookReader) {
        this.bookReader = bookReader;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentAudio = null;
        this.audioCache = new Map(); // Cache generated audio
        this.settings = {
            voice: 'alloy', // alloy, echo, fable, onyx, nova, shimmer
            model: 'tts-1', // tts-1 or tts-1-hd
            volume: 0.8,
            playbackRate: 1.0
        };
        this.currentPosition = 0;
        this.textSegments = [];
        this.displaySegments = []; // Smaller segments for visual display (~100 words each)
        this.currentSegmentAudios = [];
        this.currentDisplaySegmentIndex = 0; // Track current display segment being highlighted
        this.isGenerating = false;
        this.escapeKeyHandler = null; // For expanded view escape key handling
        this.init();
    }

    init() {
        this.createAudioControls();
        this.loadAudioSettings();
        this.checkAIAvailability();
    }

    async checkAIAvailability() {
        try {
            console.log(`🔍 Checking AI availability...`);
            const response = await fetch('/api/config');
            console.log(`🔍 Config response status:`, response.status, response.statusText);
            
            const config = await response.json();
            console.log(`🔍 Config data:`, config);
            
            this.aiAudioEnabled = config.features?.ai_audio_enabled || false;
            console.log(`🔍 AI audio enabled:`, this.aiAudioEnabled);
            
            if (!this.aiAudioEnabled) {
                console.warn('❌ AI Audio not available. Check OpenAI API key configuration.');
                this.showFallbackMessage();
            } else {
                console.log('✅ AI Audio is available and ready to use');
            }
        } catch (error) {
            console.error('❌ Error checking AI availability:', error);
            this.aiAudioEnabled = false;
            this.showFallbackMessage();
        }
    }

    showFallbackMessage() {
        const audioPanel = document.getElementById('audiobookPanel');
        if (audioPanel) {
            const fallbackMsg = document.createElement('div');
            fallbackMsg.className = 'audio-fallback-message';
            fallbackMsg.innerHTML = `
                <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <strong>AI Audio Unavailable:</strong> OpenAI API key not configured. 
                    <a href="#" onclick="this.parentElement.style.display='none'">Dismiss</a>
                </div>
            `;
            audioPanel.insertBefore(fallbackMsg, audioPanel.firstChild);
        }
    }

    createAudioControls() {
        // Create audio control panel
        const audioPanel = document.createElement('div');
        audioPanel.id = 'audiobookPanel';
        audioPanel.className = 'audiobook-panel';
        audioPanel.innerHTML = `
            <div class="audio-controls">
                <button id="audioSettingsBtn" class="audio-btn settings-btn sleek-settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l1.86-1.41c.2-.15.25-.42.13-.64l-1.86-3.23c-.12-.22-.39-.3-.61-.22l-2.17.87c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.17-.87c-.22-.08-.49 0-.61.22L2.99 8.87c-.12.22-.07.49.13.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-1.45 1.12c-.2.15-.25.42-.13.64l1.86 3.23c.12.22.39.3.61.22l2.17-.87c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.17.87c.22.08.49 0 .61-.22l1.86-3.23c.12-.22.07-.49-.13-.64l-1.45-1.12z"/>
                    </svg>
                </button>
                <div class="audio-controls-center">
                    <button id="audioRewind30Btn" class="audio-btn rewind-btn" disabled>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                        </svg>
                        <text class="skip-text">30s</text>
                    </button>
                    <button id="audioPlayPauseBtn" class="audio-btn play-btn main-play-btn" disabled>
                        <svg class="play-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <svg class="pause-icon hidden" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    </button>
                    <button id="audioForward30Btn" class="audio-btn forward-btn" disabled>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                        </svg>
                        <text class="skip-text">30s</text>
                    </button>
                </div>
                <button id="audioExpandBtn" class="audio-btn expand-btn sleek-settings">
                    <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                    <svg class="collapse-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                    </svg>
                </button>
                <div class="generation-status" id="generationStatus" style="display: none;">
                    <div class="generation-spinner"></div>
                    <span>Generating AI audio...</span>
                </div>
            </div>
            <div class="audio-progress">
                <div class="progress-bar">
                    <div id="audioProgressFill" class="progress-fill"></div>
                </div>
                <div class="progress-info">
                    <span id="audioCurrentTime">0:00</span> / <span id="audioTotalTime">0:00</span>
                </div>
            </div>
            <div id="audioScrollingText" class="audio-scrolling-text">
                <div id="audioScrollingTextContent" class="audio-scrolling-text-content"></div>
            </div>
        `;

        // Add exit fullscreen button (initially hidden)
        const exitFullscreenBtn = document.createElement('button');
        exitFullscreenBtn.id = 'audioExitFullscreenBtn';
        exitFullscreenBtn.className = 'audio-exit-fullscreen-btn';
        exitFullscreenBtn.title = 'Exit Fullscreen (Esc)';
        exitFullscreenBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
        `;
        
        // Insert exit button into the body (will be positioned with CSS)
        document.body.appendChild(exitFullscreenBtn);

        // Insert audio panel after the chapter navigation
        const chapterNav = document.querySelector('.chapter-navigation');
        chapterNav.parentNode.insertBefore(audioPanel, chapterNav.nextSibling);

        // Set up scrolling text event listeners
        this.setupScrollingTextListeners();

        // Create audio settings panel
        this.createAudioSettingsPanel();
        
        // Set up event listeners
        this.setupAudioEventListeners();
    }

    createAudioSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'audioSettingsPanel';
        settingsPanel.className = 'audio-settings-panel';
        settingsPanel.innerHTML = `
            <div class="audio-settings-content">
                <h3>AI Audio Settings</h3>
                
                <div class="setting-group">
                    <label>AI Voice</label>
                    <select id="voiceSelect" class="voice-select">
                        <option value="alloy">Alloy (Balanced)</option>
                        <option value="echo">Echo (Male)</option>
                        <option value="fable">Fable (British Accent)</option>
                        <option value="onyx">Onyx (Deep Male)</option>
                        <option value="nova">Nova (Female)</option>
                        <option value="shimmer">Shimmer (Soft Female)</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>Audio Quality</label>
                    <select id="modelSelect" class="voice-select">
                        <option value="tts-1">Standard (Faster)</option>
                        <option value="tts-1-hd">High Definition (Better Quality)</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>Playback Speed</label>
                    <input type="range" id="playbackRateSlider" min="0.5" max="2.0" step="0.1" value="1.0">
                    <span id="playbackRateDisplay">1.0x</span>
                </div>

                <div class="setting-group">
                    <label>Volume</label>
                    <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="0.8">
                    <span id="volumeDisplay">80%</span>
                </div>

                <div class="setting-group">
                    <label>Cache Management</label>
                    <button id="clearCacheBtn" class="setting-btn">Clear Audio Cache</button>
                    <small style="opacity: 0.7;">Cached: <span id="cacheSize">0</span> segments</small>
                </div>

                <button id="closeAudioSettings" class="close-btn">Close</button>
            </div>
        `;

        document.body.appendChild(settingsPanel);
    }

    setupScrollingTextListeners() {
        const scrollingTextContainer = document.getElementById('audioScrollingText');
        if (!scrollingTextContainer) return;

        // Track if user is manually scrolling to prevent auto-scroll conflicts
        this.isManuallyScrolling = false;
        this.scrollTimeout = null;

        scrollingTextContainer.addEventListener('scroll', () => {
            // User is manually scrolling
            this.isManuallyScrolling = true;
            
            // Clear any existing timeout
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            
            // Reset manual scrolling flag after user stops scrolling
            this.scrollTimeout = setTimeout(() => {
                this.isManuallyScrolling = false;
            }, 1000); // 1 second after last scroll event
        });

        // Allow scroll wheel and touch scrolling
        scrollingTextContainer.addEventListener('wheel', (e) => {
            // Prevent event from bubbling up to prevent page scroll
            e.stopPropagation();
        });

        console.log('📜 Set up scrolling text event listeners');
    }

    populateVoiceOptions() {
        // AI voices are predefined, no need to load them dynamically
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect && this.settings.voice) {
            voiceSelect.value = this.settings.voice;
        }
    }

    setupAudioEventListeners() {
        // Play/Pause button
        document.getElementById('audioPlayPauseBtn').addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Rewind 30 seconds button
        document.getElementById('audioRewind30Btn').addEventListener('click', () => {
            this.skipAudio(-30);
        });

        // Forward 30 seconds button
        document.getElementById('audioForward30Btn').addEventListener('click', () => {
            this.skipAudio(30);
        });

        // Audio settings button
        document.getElementById('audioSettingsBtn').addEventListener('click', () => {
            this.toggleAudioSettings();
        });

        // Audio expand button
        document.getElementById('audioExpandBtn').addEventListener('click', () => {
            this.toggleExpandedView();
        });

        // Audio exit fullscreen button
        document.getElementById('audioExitFullscreenBtn').addEventListener('click', () => {
            this.toggleExpandedView();
        });

        // Settings controls
        document.getElementById('playbackRateSlider').addEventListener('input', (e) => {
            this.settings.playbackRate = parseFloat(e.target.value);
            document.getElementById('playbackRateDisplay').textContent = e.target.value + 'x';
            if (this.currentAudio) {
                this.currentAudio.playbackRate = this.settings.playbackRate;
            }
            this.saveAudioSettings();
        });

        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.settings.volume = parseFloat(e.target.value);
            document.getElementById('volumeDisplay').textContent = Math.round(e.target.value * 100) + '%';
            if (this.currentAudio) {
                this.currentAudio.volume = this.settings.volume;
            }
            this.saveAudioSettings();
        });

        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            const oldVoice = this.settings.voice;
            this.settings.voice = e.target.value;
            this.saveAudioSettings();
            
            console.log(`🔄 Voice changed from ${oldVoice} to ${this.settings.voice}`);
            
            // Don't clear cache - just check for existing audio with new voice/model
            // The database query will handle finding existing audio or fallback to any available audio
            
            // If we're currently on a chapter, prepare audio (will check database first)
            if (this.bookReader.currentChapterId) {
                console.log('🔄 Re-checking chapter audio with new voice settings...');
                this.prepareChapterAudio();
            }
        });

        document.getElementById('modelSelect').addEventListener('change', (e) => {
            const oldModel = this.settings.model;
            this.settings.model = e.target.value;
            this.saveAudioSettings();
            
            console.log(`🔄 Model changed from ${oldModel} to ${this.settings.model}`);
            
            // Don't clear cache - just check for existing audio with new voice/model
            // The database query will handle finding existing audio or fallback to any available audio
            
            // If we're currently on a chapter, prepare audio (will check database first)
            if (this.bookReader.currentChapterId) {
                console.log('🔄 Re-checking chapter audio with new model settings...');
                this.prepareChapterAudio();
            }
        });

        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.clearAudioCache();
            // Also clear localStorage settings in case they're corrupted
            localStorage.removeItem('aristoAudioSettings');
            // Reset to defaults
            this.settings = {
                voice: 'alloy',
                model: 'tts-1',
                volume: 0.8,
                playbackRate: 1.0
            };
            this.applyAudioSettings();
            console.log('🗑️ Cleared cache and reset settings to defaults');
        });

        document.getElementById('closeAudioSettings').addEventListener('click', () => {
            this.closeAudioSettings();
        });

        // Listen for chapter changes
        document.addEventListener('chapterLoaded', () => {
            this.prepareChapterAudio();
        });
    }

    async prepareChapterAudio() {
        console.log(`🎵 prepareChapterAudio called`);
        console.log(`🎵 AI audio enabled:`, this.aiAudioEnabled);
        
        if (!this.aiAudioEnabled) {
            console.log(`❌ AI audio not enabled, disabling play button`);
            document.getElementById('audioPlayPauseBtn').disabled = true;
            return;
        }

        // Stop any current audio
        this.stopAudio();

        // Get the current chapter content
        const textContent = document.getElementById('textContent');
        if (!textContent) {
            console.error(`❌ No textContent element found`);
            return;
        }

        const chapterText = textContent.textContent;
        console.log(`📖 Chapter text length:`, chapterText.length);
        console.log(`📖 Chapter text preview:`, chapterText.substring(0, 200) + '...');

        // Split text into manageable segments (OpenAI has 4096 char limit)
        this.textSegments = this.splitTextIntoSegments(chapterText);
        console.log(`📝 Text split into ${this.textSegments.length} segments:`);
        this.textSegments.forEach((segment, i) => {
            console.log(`   Segment ${i + 1}: ${segment.length} chars - "${segment.substring(0, 50)}..."`);
        });

        // Create smaller display segments for better visual tracking (roughly 100 words each)
        this.displaySegments = this.createDisplaySegments(chapterText);
        console.log(`📜 Created ${this.displaySegments.length} display segments for scrolling text`);

        // Populate scrolling text container
        this.populateScrollingText();

        this.currentPosition = 0;
        this.currentDisplaySegmentIndex = 0; // Reset display segment tracking
        this.currentSegmentAudios = [];
        
        // Check if chapter already has audio for current voice/model settings
        const chapterId = this.bookReader.currentChapterId;
        console.log(`🗄️ Checking chapter audio for chapter ID: ${chapterId}`);
        
        if (!chapterId) {
            console.error('❌ No chapter ID available');
            await this.generateAllSegmentAudio();
            return;
        }

        // Check local cache first (try current settings, then any settings)
        const currentCacheKey = `chapter-${chapterId}-${this.settings.voice}-${this.settings.model}`;
        console.log(`🗄️ Checking local cache with key:`, currentCacheKey);
        
        if (this.audioCache.has(currentCacheKey)) {
            console.log(`✅ Found cached audio in local cache (current voice/model)`);
            this.currentSegmentAudios = this.audioCache.get(currentCacheKey);
            this.enablePlayback();
            return;
        }

        // Check if we have cached audio from any voice/model combination for this chapter
        const anyChapterCacheKey = Array.from(this.audioCache.keys()).find(key => 
            key.startsWith(`chapter-${chapterId}-`)
        );
        if (anyChapterCacheKey) {
            console.log(`✅ Found cached audio in local cache (any voice/model): ${anyChapterCacheKey}`);
            const cachedAudio = this.audioCache.get(anyChapterCacheKey);
            // Store under current cache key as well for faster access
            this.audioCache.set(currentCacheKey, cachedAudio);
            this.currentSegmentAudios = cachedAudio;
            this.enablePlayback();
            return;
        }

        // Check chapter audio in database FIRST - this is the priority
        console.log(`🗄️ Checking chapter audio in database...`);
        try {
            // Check if DatabaseService is available and initialized
            if (typeof DatabaseService === 'undefined' || !DatabaseService.supabase) {
                console.warn('⚠️ DatabaseService not available or not initialized, checking if we can initialize...');
                
                // Try to ensure Supabase is ready
                if (typeof ensureSupabaseReady === 'function') {
                    await ensureSupabaseReady();
                    console.log('✅ DatabaseService initialization attempt completed');
                } else {
                    console.warn('⚠️ Cannot initialize DatabaseService, proceeding to generate new audio...');
                    await this.generateAllSegmentAudio();
                    return;
                }
            }
            
            const chapterAudio = await DatabaseService.getChapterAudio(chapterId, this.settings.voice, this.settings.model);
            if (chapterAudio && chapterAudio.audio_data) {
                console.log(`✅ Found matching chapter audio in database, loading...`);
                console.log(`✅ Chapter audio details:`, {
                    voice: chapterAudio.audio_voice,
                    model: chapterAudio.audio_model,
                    generated: chapterAudio.audio_generated_at,
                    dataLength: chapterAudio.audio_data.length
                });
                
                // Parse the audio data (should be array of base64 strings)
                let audioSegments;
                try {
                    audioSegments = typeof chapterAudio.audio_data === 'string' 
                        ? JSON.parse(chapterAudio.audio_data)
                        : chapterAudio.audio_data;
                } catch (parseError) {
                    console.error('❌ Error parsing chapter audio data:', parseError);
                    console.log('🔄 Falling back to generating new audio...');
                    await this.generateAllSegmentAudio();
                    return;
                }
                
                if (audioSegments && Array.isArray(audioSegments) && audioSegments.length > 0) {
                    console.log(`🔄 Converting ${audioSegments.length} base64 audio segments to playable format...`);
                    
                    // Convert back to Audio objects with metadata
                    const audioObjects = [];
                    let validSegmentCount = 0;
                    
                    for (let i = 0; i < audioSegments.length; i++) {
                        const base64Data = audioSegments[i];
                        if (base64Data && typeof base64Data === 'string') {
                            try {
                                const blob = this.base64ToBlob(base64Data, 'audio/mp3');
                                const audioUrl = URL.createObjectURL(blob);
                                const audioElement = new Audio(audioUrl);
                                
                                // Wait for metadata to load to get duration
                                await new Promise((resolve, reject) => {
                                    const timeout = setTimeout(() => {
                                        reject(new Error('Audio metadata load timeout'));
                                    }, 5000); // 5 second timeout
                                    
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
                                
                                audioObjects.push({
                                    audio: audioElement,
                                    url: audioUrl,
                                    blob: blob,
                                    duration: audioElement.duration,
                                    text: this.textSegments[i] || ''
                                });
                                validSegmentCount++;
                            } catch (error) {
                                console.warn(`⚠️ Error loading audio segment ${i}:`, error);
                                audioObjects.push(null);
                            }
                        } else {
                            console.warn(`⚠️ Invalid base64 data for segment ${i}`);
                            audioObjects.push(null);
                        }
                    }
                    
                    if (validSegmentCount > 0) {
                        this.currentSegmentAudios = audioObjects;
                        // Store in local cache for faster future access
                        const localCacheKey = `chapter-${chapterId}-${chapterAudio.audio_voice}-${chapterAudio.audio_model}`;
                        this.audioCache.set(localCacheKey, audioObjects);
                        // Also cache under current settings for faster future access
                        this.audioCache.set(currentCacheKey, audioObjects);
                        this.enablePlayback();
                        console.log(`✅ Successfully loaded ${validSegmentCount}/${audioObjects.length} audio segments from database`);
                        return;
                    } else {
                        console.warn('⚠️ No valid audio segments could be loaded from database');
                    }
                } else {
                    console.log('⚠️ Chapter audio data is empty or not in expected format');
                }
            } else {
                console.log(`📭 No matching chapter audio found in database (voice: ${this.settings.voice}, model: ${this.settings.model})`);
            }
        } catch (error) {
            console.warn('⚠️ Error checking chapter audio in database:', error);
        }

        console.log(`🎙️ No existing audio found, generating new audio...`);
        // Only generate audio if no existing audio was found
        await this.generateAllSegmentAudio();
    }

    splitTextIntoSegments(text) {
        const maxLength = 3000; // Leave some buffer under 4096 limit
        const segments = [];
        
        // Split by paragraphs first
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        
        let currentSegment = '';
        
        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed limit, save current segment
            if (currentSegment.length + paragraph.length > maxLength && currentSegment.length > 0) {
                segments.push(currentSegment.trim());
                currentSegment = paragraph;
            } else {
                currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
            }
        }
        
        // Add the last segment
        if (currentSegment.trim().length > 0) {
            segments.push(currentSegment.trim());
        }
        
        // If still too long, split by sentences
        const finalSegments = [];
        for (const segment of segments) {
            if (segment.length <= maxLength) {
                finalSegments.push(segment);
            } else {
                // Split by sentences
                const sentences = segment.match(/[^\.!?]+[\.!?]+/g) || [segment];
                let currentSentenceGroup = '';
                
                for (const sentence of sentences) {
                    if (currentSentenceGroup.length + sentence.length > maxLength && currentSentenceGroup.length > 0) {
                        finalSegments.push(currentSentenceGroup.trim());
                        currentSentenceGroup = sentence;
                    } else {
                        currentSentenceGroup += sentence;
                    }
                }
                
                if (currentSentenceGroup.trim().length > 0) {
                    finalSegments.push(currentSentenceGroup.trim());
                }
            }
        }
        
        return finalSegments;
    }

    createDisplaySegments(text) {
        // Create smaller segments (~170 words each) for visual display
        const targetWordsPerSegment = 170;
        const words = text.split(/\s+/).filter(word => word.trim().length > 0);
        const displaySegments = [];
        
        for (let i = 0; i < words.length; i += targetWordsPerSegment) {
            const segmentWords = words.slice(i, i + targetWordsPerSegment);
            const segmentText = segmentWords.join(' ');
            displaySegments.push({
                text: segmentText,
                wordCount: segmentWords.length,
                startWordIndex: i,
                endWordIndex: i + segmentWords.length - 1
            });
        }
        
        console.log(`📜 Created ${displaySegments.length} display segments, average ${Math.round(words.length / displaySegments.length)} words each`);
        return displaySegments;
    }

    getCacheKey() {
        // Use reliable properties for persistent caching across sessions
        const bookId = this.bookReader.currentBookId || 'unknown-book';
        const chapterId = this.bookReader.currentChapterId || 'unknown-chapter';
        const chapterNumber = this.bookReader.currentChapterNumber || 1;
        
        // Get chapter title from the DOM if available, otherwise use chapter number
        const chapterTitleElement = document.getElementById('chapterTitle');
        const chapterTitle = chapterTitleElement?.textContent || `chapter-${chapterNumber}`;
        
        // Clean values for cache key (remove special characters)
        const cleanBookId = String(bookId).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const cleanChapterId = String(chapterId).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const cleanChapterTitle = chapterTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        
        // Create a persistent cache key that will work across sessions
        const cacheKey = `audio-${cleanBookId}-ch${chapterNumber}-${cleanChapterId}-${cleanChapterTitle}-${this.settings.voice}-${this.settings.model}`.replace(/-+/g, '-');
        
        console.log(`🗄️ Generated cache key: ${cacheKey}`);
        console.log(`🗄️ Based on: bookId=${bookId}, chapterId=${chapterId}, chapterNumber=${chapterNumber}, voice=${this.settings.voice}, model=${this.settings.model}`);
        
        return cacheKey;
    }

    async generateAllSegmentAudio() {
        // Only generate if we don't already have audio
        const chapterId = this.bookReader.currentChapterId;
        if (chapterId) {
            console.log(`🔍 Final check: Ensuring no audio exists before generating (Chapter ID: ${chapterId})`);
            try {
                // One final database check before generating
                if (typeof DatabaseService !== 'undefined') {
                    const existingAudio = await DatabaseService.getChapterAudio(chapterId, this.settings.voice, this.settings.model);
                    if (existingAudio && existingAudio.audio_data) {
                        console.log(`⚠️ Audio found during final check - avoiding duplicate generation`);
                        console.log(`   This might indicate a race condition or caching issue`);
                        // Try to load this existing audio
                        this.currentSegmentAudios = [];
                        this.enablePlayback();
                        return;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Final database check failed:', error);
            }
        }
        
        this.showGenerationStatus(true);
        const generatedAudios = [];
        
        try {
            console.log(`🎤 Generating AI audio for ${this.textSegments.length} segments...`);
            console.log(`🎤 Text segments:`, this.textSegments.map(s => s.substring(0, 50) + '...'));
            
            for (let i = 0; i < this.textSegments.length; i++) {
                const segment = this.textSegments[i];
                console.log(`🎤 Generating segment ${i + 1}/${this.textSegments.length} (${segment.length} chars)`);
                
                try {
                    const audioBlob = await this.generateSegmentAudio(segment);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audioElement = new Audio(audioUrl);
                    
                    // Wait for audio to load to get duration
                    await new Promise((resolve, reject) => {
                        audioElement.addEventListener('loadedmetadata', () => {
                            console.log(`✅ Audio metadata loaded for segment ${i + 1}, duration: ${audioElement.duration}s`);
                            resolve();
                        });
                        audioElement.addEventListener('error', (e) => {
                            console.error(`❌ Audio load error for segment ${i + 1}:`, e);
                            reject(e);
                        });
                        audioElement.load();
                    });
                    
                    generatedAudios.push({
                        audio: audioElement,
                        url: audioUrl,
                        blob: audioBlob,
                        duration: audioElement.duration,
                        text: segment
                    });
                    
                    console.log(`✅ Successfully generated audio for segment ${i + 1}`);
                    
                } catch (error) {
                    console.error(`❌ Failed to generate audio for segment ${i + 1}:`, error);
                    // Create a fallback silent audio or skip this segment
                    generatedAudios.push(null);
                }
            }
            
            console.log(`🎤 Audio generation complete. Valid segments: ${generatedAudios.filter(a => a !== null).length}/${generatedAudios.length}`);
            
            // Save to local cache (using full audio objects - not just Audio elements)
            const saveCacheKey = `chapter-${chapterId}-${this.settings.voice}-${this.settings.model}`;
            this.audioCache.set(saveCacheKey, generatedAudios);
            this.currentSegmentAudios = generatedAudios;
            
            // Save to chapter in database (using base64 data) - PRIORITY SAVE
            if (chapterId) {
                console.log(`💾 Saving audio to chapter ${chapterId} in database...`);
                try {
                    const base64Array = [];
                    for (const item of generatedAudios) {
                        if (item && item.blob) {
                            const base64Data = await this.blobToBase64(item.blob);
                            base64Array.push(base64Data);
                        } else {
                            base64Array.push(null);
                        }
                    }
                    
                    // Ensure DatabaseService is available
                    if (typeof DatabaseService === 'undefined') {
                        console.warn('⚠️ DatabaseService not available - cannot save to database');
                    } else {
                        const saveSuccess = await DatabaseService.saveChapterAudio(
                            chapterId,
                            JSON.stringify(base64Array),
                            this.settings.voice,
                            this.settings.model
                        );
                        
                        if (saveSuccess) {
                            console.log(`✅ Audio successfully saved to chapter ${chapterId} in database`);
                            console.log(`   Voice: ${this.settings.voice}, Model: ${this.settings.model}`);
                            console.log(`   Segments saved: ${base64Array.filter(s => s !== null).length}/${base64Array.length}`);
                        } else {
                            console.error('❌ Failed to save audio to chapter in database');
                        }
                    }
                } catch (saveError) {
                    console.error('❌ Error saving audio to chapter database:', saveError);
                }
            } else {
                console.warn('⚠️ No chapter ID available - cannot save to database');
            }
            
            this.enablePlayback();
            console.log('✅ All audio segments processed successfully');
            
        } catch (error) {
            console.error('❌ Error generating audio segments:', error);
            this.showError('Failed to generate AI audio. Please try again.');
        } finally {
            this.showGenerationStatus(false);
        }
    }

    async generateSegmentAudio(text) {
        try {
            console.log(`🎙️ Generating audio for text (${text.length} chars):`, text.substring(0, 100) + '...');
            console.log(`🎙️ Current settings:`, this.settings);
            console.log(`🎙️ Voice type:`, typeof this.settings.voice, 'Voice value:', this.settings.voice);
            
            // Ensure voice is a valid string
            const voice = typeof this.settings.voice === 'string' && this.settings.voice ? this.settings.voice : 'alloy';
            const model = typeof this.settings.model === 'string' && this.settings.model ? this.settings.model : 'tts-1';
            
            console.log(`🎙️ Using voice:`, voice, 'Using model:', model);
            
            const requestBody = {
                text: text,
                voice: voice,
                model: model
            };
            
            console.log(`🎙️ Request body:`, requestBody);
            
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log(`🎙️ Response status:`, response.status, response.statusText);
            
            const data = await response.json();
            console.log(`🎙️ Response data:`, {
                success: data.success,
                hasAudioData: !!data.audio_data,
                audioDataLength: data.audio_data?.length,
                error: data.error,
                textLength: data.text_length,
                voice: data.voice,
                model: data.model
            });
            
            if (!response.ok) {
                console.error(`❌ HTTP error ${response.status}:`, data);
                throw new Error(data.error || `HTTP ${response.status}: Failed to generate audio`);
            }

            if (!data.success) {
                console.error(`❌ API returned success=false:`, data);
                throw new Error(data.error || 'Audio generation failed');
            }

            if (!data.audio_data) {
                console.error(`❌ No audio data in response:`, data);
                throw new Error('No audio data received from server');
            }

            console.log(`✅ Converting base64 to blob (${data.audio_data.length} chars)`);
            // Convert base64 to blob
            const audioBlob = this.base64ToBlob(data.audio_data, 'audio/mp3');
            console.log(`✅ Audio blob created:`, audioBlob.size, 'bytes');
            return audioBlob;
            
        } catch (error) {
            console.error('❌ Error in generateSegmentAudio:', {
                message: error.message,
                stack: error.stack,
                textLength: text.length,
                voice: this.settings.voice,
                model: this.settings.model
            });
            throw error;
        }
    }

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
            console.error('Error converting base64 to blob:', error);
            throw new Error('Failed to process audio data');
        }
    }

    enablePlayback() {
        console.log(`🔊 enablePlayback called`);
        console.log(`🔊 currentSegmentAudios length: ${this.currentSegmentAudios.length}`);
        
        // Check if we have any valid audio segments
        const validSegments = this.currentSegmentAudios.filter(audio => audio !== null);
        console.log(`🔊 Valid audio segments: ${validSegments.length}/${this.currentSegmentAudios.length}`);
        
        if (validSegments.length === 0) {
            console.error(`❌ No valid audio segments found! Cannot enable playback.`);
            this.showError('No audio could be generated for this chapter. Please try again.');
            document.getElementById('audioPlayPauseBtn').disabled = true;
            return;
        }
        
        // Calculate total duration
        const totalDuration = validSegments.reduce((total, audio) => total + (audio.duration || 0), 0);
        console.log(`🔊 Total audio duration: ${totalDuration}s`);
        
        document.getElementById('audioTotalTime').textContent = this.formatTime(Math.ceil(totalDuration));
        document.getElementById('audioPlayPauseBtn').disabled = false;
        
        console.log(`✅ Audio ready: ${validSegments.length} segments, ${Math.ceil(totalDuration)}s total`);
    }

    showGenerationStatus(show) {
        const statusElement = document.getElementById('generationStatus');
        if (statusElement) {
            statusElement.style.display = show ? 'flex' : 'none';
        }
        
        // Disable controls while generating
        document.getElementById('audioPlayPauseBtn').disabled = show;
        document.getElementById('audioRewind30Btn').disabled = show;
        document.getElementById('audioForward30Btn').disabled = show;
    }

    showError(message) {
        const audioControls = document.querySelector('.audio-controls');
        let errorElement = audioControls.querySelector('.audio-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'audio-error';
            errorElement.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                padding: 0.5rem 1rem;
                border-radius: 0.25rem;
                margin: 0.5rem 0;
                font-size: 0.875rem;
            `;
            audioControls.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseAudio();
        } else {
            this.playAudio();
        }
    }

    playAudio() {
        console.log(`▶️ playAudio called`);
        console.log(`▶️ currentSegmentAudios available:`, !!this.currentSegmentAudios);
        console.log(`▶️ currentSegmentAudios length:`, this.currentSegmentAudios?.length);
        console.log(`▶️ currentSegmentAudios sample:`, this.currentSegmentAudios?.[0]);
        console.log(`▶️ isPaused:`, this.isPaused);
        console.log(`▶️ currentAudio exists:`, !!this.currentAudio);
        console.log(`▶️ currentPosition:`, this.currentPosition);
        
        if (!this.currentSegmentAudios || this.currentSegmentAudios.length === 0) {
            console.warn('❌ No audio segments available');
            return;
        }

        // Stop any highlight/note audio when main audiobook starts playing
        if (typeof window.AudioUIHelper !== 'undefined' && window.AudioUIHelper) {
            console.log('⏸️ AudiobookReader: Stopping highlight/note audio for main audiobook');
            window.AudioUIHelper.stopAllAudio();
        }

        if (this.isPaused && this.currentAudio) {
            console.log('▶️ Resuming paused audio');
            // Resume current audio
            this.currentAudio.play();
            this.isPaused = false;
        } else {
            console.log(`▶️ Starting playback from position ${this.currentPosition}`);
            // Reset scrolling text if starting from beginning
            if (this.currentPosition === 0) {
                this.resetScrollingText();
            }
            // Start from current position
            this.playSegment(this.currentPosition);
        }
        
        this.isPlaying = true;
        this.updatePlayButton(true);
        document.getElementById('audioRewind30Btn').disabled = false;
        document.getElementById('audioForward30Btn').disabled = false;
        console.log('▶️ Playback started');
    }

    pauseAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.isPaused = true;
            this.isPlaying = false;
            this.updatePlayButton(false);
        }
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.currentDisplaySegmentIndex = 0; // Reset display segment tracking
        this.currentAudio = null;
        
        // Remove highlights
        document.querySelectorAll('.audio-highlight').forEach(el => {
            el.classList.remove('audio-highlight');
        });

        // Reset scrolling text
        this.resetScrollingText();
        
        this.updatePlayButton(false);
        document.getElementById('audioRewind30Btn').disabled = true;
        document.getElementById('audioForward30Btn').disabled = true;
        this.updateProgress(0);
    }

    resetScrollingText() {
        const scrollingTextContainer = document.getElementById('audioScrollingText');
        if (!scrollingTextContainer) return;

        // Remove all current segment highlights
        document.querySelectorAll('.current-segment').forEach(el => {
            el.classList.remove('current-segment');
        });

        // Reset scroll position using native scrolling
        scrollingTextContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Reset manual scrolling flag
        this.isManuallyScrolling = false;
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        console.log('📜 Reset scrolling text position');
    }

    skipAudio(seconds) {
        console.log(`⏩ skipAudio called with ${seconds} seconds`);
        
        if (!this.currentSegmentAudios || this.currentSegmentAudios.length === 0) {
            console.warn('❌ No audio segments available for skipping');
            return;
        }

        if (!this.currentAudio || this.currentPosition >= this.currentSegmentAudios.length) {
            console.warn('❌ No current audio or invalid position for skipping');
            return;
        }

        // Calculate total elapsed time across all segments
        let totalElapsed = 0;
        
        // Add duration of completed segments
        for (let i = 0; i < this.currentPosition; i++) {
            const audioData = this.currentSegmentAudios[i];
            if (audioData && audioData.duration) {
                totalElapsed += audioData.duration;
            }
        }
        
        // Add current segment progress
        totalElapsed += this.currentAudio.currentTime;
        
        // Calculate new target time
        const newTime = totalElapsed + seconds;
        
        console.log(`⏩ Current total time: ${totalElapsed.toFixed(1)}s, target time: ${newTime.toFixed(1)}s`);
        
        // Ensure we don't go before the beginning
        if (newTime < 0) {
            console.log('⏩ Skip would go before start, going to beginning');
            this.stopAudio();
            if (this.isPlaying) {
                this.playAudio();
            }
            return;
        }
        
        // Calculate total duration
        let totalDuration = 0;
        for (const audioData of this.currentSegmentAudios) {
            if (audioData && audioData.duration) {
                totalDuration += audioData.duration;
            }
        }
        
        // Ensure we don't go past the end
        if (newTime >= totalDuration) {
            console.log('⏩ Skip would go past end, going to end');
            this.onChapterComplete();
            return;
        }
        
        // Find which segment contains the target time
        let accumulatedTime = 0;
        let targetSegmentIndex = 0;
        let timeWithinSegment = newTime;
        
        for (let i = 0; i < this.currentSegmentAudios.length; i++) {
            const audioData = this.currentSegmentAudios[i];
            if (audioData && audioData.duration) {
                if (accumulatedTime + audioData.duration > newTime) {
                    targetSegmentIndex = i;
                    timeWithinSegment = newTime - accumulatedTime;
                    break;
                }
                accumulatedTime += audioData.duration;
            }
        }
        
        console.log(`⏩ Target segment: ${targetSegmentIndex}, time within segment: ${timeWithinSegment.toFixed(1)}s`);
        
        const wasPlaying = this.isPlaying;
        
        // If we need to switch segments
        if (targetSegmentIndex !== this.currentPosition) {
            // Stop current audio completely before switching
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            }
            
            this.currentPosition = targetSegmentIndex;
            
            // Update scrolling text highlight immediately
            this.highlightScrollingText(targetSegmentIndex);
            
            if (wasPlaying) {
                // Start the new segment and set the time
                this.playSegment(this.currentPosition).then(() => {
                    if (this.currentAudio && timeWithinSegment > 0) {
                        this.currentAudio.currentTime = Math.min(timeWithinSegment, this.currentAudio.duration);
                    }
                });
            } else {
                // Just update position for when playback resumes
                if (this.currentSegmentAudios[targetSegmentIndex]?.audio) {
                    this.currentAudio = this.currentSegmentAudios[targetSegmentIndex].audio;
                }
            }
        } else {
            // Same segment, just adjust time
            if (this.currentAudio) {
                this.currentAudio.currentTime = Math.min(Math.max(0, timeWithinSegment), this.currentAudio.duration);
                console.log(`⏩ Set current time to: ${this.currentAudio.currentTime.toFixed(1)}s`);
            }
        }
    }

    async playSegment(index) {
        console.log(`🎵 playSegment called with index: ${index}`);
        console.log(`🎵 currentSegmentAudios.length: ${this.currentSegmentAudios.length}`);
        console.log(`🎵 currentSegmentAudios:`, this.currentSegmentAudios);
        
        // First, ensure any existing audio is stopped
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        if (index >= this.currentSegmentAudios.length) {
            console.log(`❌ Index ${index} >= length ${this.currentSegmentAudios.length}, calling onChapterComplete`);
            this.onChapterComplete();
            return;
        }

        const audioData = this.currentSegmentAudios[index];
        console.log(`🎵 audioData for index ${index}:`, audioData);
        console.log(`🎵 audioData type:`, typeof audioData);
        console.log(`🎵 audioData.audio exists:`, !!audioData?.audio);
        console.log(`🎵 audioData.audio type:`, typeof audioData?.audio);
        
        if (!audioData) {
            console.log(`⚠️ No audio data for index ${index}, skipping to next`);
            // Skip null/failed segments
            this.currentPosition++;
            if (this.currentPosition < this.currentSegmentAudios.length) {
                this.playSegment(this.currentPosition);
            } else {
                console.log(`❌ No more segments to play`);
                this.stopAudio();
            }
            return;
        }

        if (!audioData.audio || !(audioData.audio instanceof HTMLAudioElement)) {
            console.error(`❌ Invalid audio element at index ${index}:`, audioData.audio);
            // Try next segment
            this.currentPosition++;
            if (this.currentPosition < this.currentSegmentAudios.length) {
                this.playSegment(this.currentPosition);
            } else {
                console.log(`❌ No more valid segments to play`);
                this.stopAudio();
            }
            return;
        }

        this.currentAudio = audioData.audio;
        console.log(`✅ Set currentAudio:`, this.currentAudio);
        
        // Reset audio to beginning to prevent issues
        this.currentAudio.currentTime = 0;
        
        // Apply settings
        this.currentAudio.volume = this.settings.volume;
        this.currentAudio.playbackRate = this.settings.playbackRate;

        // Remove any existing event listeners by cloning the element
        const newAudio = this.currentAudio.cloneNode();
        newAudio.src = this.currentAudio.src;
        newAudio.volume = this.currentAudio.volume;
        newAudio.playbackRate = this.currentAudio.playbackRate;
        this.currentAudio = newAudio;

        // Set up event listeners
        this.currentAudio.addEventListener('timeupdate', () => {
            this.updateProgressFromAudio();
        });

        this.currentAudio.addEventListener('ended', () => {
            this.currentPosition++;
            if (this.isPlaying && this.currentPosition < this.currentSegmentAudios.length) {
                this.playSegment(this.currentPosition);
            } else {
                this.onChapterComplete();
            }
        });

        this.currentAudio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            this.currentPosition++;
            if (this.currentPosition < this.currentSegmentAudios.length) {
                this.playSegment(this.currentPosition);
            } else {
                this.stopAudio();
            }
        });

        // Highlight current segment
        this.highlightCurrentSegment(index);
        
        try {
            await this.currentAudio.play();
        } catch (error) {
            console.error('Error playing audio segment:', error);
            // Try next segment
            this.currentPosition++;
            if (this.currentPosition < this.currentSegmentAudios.length) {
                this.playSegment(this.currentPosition);
            }
        }
    }

    updateProgressFromAudio() {
        if (!this.currentAudio || !this.currentSegmentAudios) return;
        
        // Calculate total progress across all segments
        let totalElapsed = 0;
        let totalDuration = 0;
        
        // Add duration of completed segments
        for (let i = 0; i < this.currentPosition; i++) {
            const audioData = this.currentSegmentAudios[i];
            if (audioData) {
                totalElapsed += audioData.duration;
            }
        }
        
        // Add current segment progress
        totalElapsed += this.currentAudio.currentTime;
        
        // Calculate total duration
        for (const audioData of this.currentSegmentAudios) {
            if (audioData) {
                totalDuration += audioData.duration;
            }
        }
        
        const percentage = totalDuration > 0 ? (totalElapsed / totalDuration) * 100 : 0;
        this.updateProgress(percentage, totalElapsed);
        
        // Update highlighting progressively based on overall progress through chapter
        // This will move the highlight through display segments as the audio plays
        this.updateScrollingTextHighlight(totalElapsed, totalDuration);
    }

    highlightCurrentSegment(index) {
        // Remove previous highlights
        document.querySelectorAll('.audio-highlight').forEach(el => {
            el.classList.remove('audio-highlight');
        });

        // Remove previous scrolling text highlights
        document.querySelectorAll('.current-segment').forEach(el => {
            el.classList.remove('current-segment');
        });

        if (index < this.textSegments.length) {
            const segmentText = this.textSegments[index];
            this.highlightTextInContent(segmentText);
            this.highlightScrollingText(index);
        }
    }

    populateScrollingText() {
        const scrollingTextContainer = document.getElementById('audioScrollingTextContent');
        if (!scrollingTextContainer || !this.displaySegments) return;

        // Create HTML with display segments wrapped in spans for individual highlighting
        let htmlContent = '';
        this.displaySegments.forEach((segment, index) => {
            htmlContent += `<span class="display-segment" data-display-segment="${index}">${segment.text}</span>`;
            if (index < this.displaySegments.length - 1) {
                htmlContent += ' ';
            }
        });

        scrollingTextContainer.innerHTML = htmlContent;
        console.log('📜 Populated scrolling text with', this.displaySegments.length, 'display segments');
        
        // Highlight the first segment initially
        if (this.displaySegments.length > 0) {
            const firstSegment = scrollingTextContainer.querySelector('[data-display-segment="0"]');
            if (firstSegment) {
                firstSegment.classList.add('current-segment');
                this.currentDisplaySegmentIndex = 0;
                console.log('📜 Initial highlight set on first segment');
            }
        }
    }

    highlightScrollingText(audioSegmentIndex) {
        const scrollingTextContainer = document.getElementById('audioScrollingTextContent');
        if (!scrollingTextContainer || !this.textSegments || !this.displaySegments) {
            console.log('📜 highlightScrollingText: Missing required elements', {
                container: !!scrollingTextContainer,
                textSegments: !!this.textSegments,
                displaySegments: !!this.displaySegments
            });
            return;
        }

        // Calculate which display segment should be highlighted based on audio segment start
        const totalAudioSegments = this.textSegments.length;
        const totalDisplaySegments = this.displaySegments.length;
        const displaySegmentsPerAudioSegment = totalDisplaySegments / totalAudioSegments;
        
        // Find the starting display segment for this audio segment
        const targetDisplaySegmentIndex = Math.floor(audioSegmentIndex * displaySegmentsPerAudioSegment);
        const clampedIndex = Math.min(Math.max(0, targetDisplaySegmentIndex), totalDisplaySegments - 1);
        
        console.log('📜 highlightScrollingText called', {
            audioSegmentIndex,
            totalAudioSegments,
            totalDisplaySegments,
            displaySegmentsPerAudioSegment: displaySegmentsPerAudioSegment.toFixed(2),
            targetDisplaySegmentIndex,
            clampedIndex
        });
        
        this.currentDisplaySegmentIndex = clampedIndex;
        this.updateDisplaySegmentHighlight(clampedIndex);
        console.log(`📜 ✅ Set initial highlight for audio segment ${audioSegmentIndex} to display segment ${clampedIndex}`);
    }

    updateScrollingTextHighlight(currentElapsed, totalDuration) {
        if (!this.displaySegments || totalDuration === 0) return;
        
        // Calculate progress within the current audio segment, not across the entire chapter
        let currentAudioSegmentElapsed = currentElapsed;
        let currentAudioSegmentDuration = 0;
        
        // Subtract duration of completed audio segments to get progress within current segment
        for (let i = 0; i < this.currentPosition; i++) {
            const audioData = this.currentSegmentAudios[i];
            if (audioData && audioData.duration) {
                currentAudioSegmentElapsed -= audioData.duration;
            }
        }
        
        // Get current audio segment duration
        if (this.currentPosition < this.currentSegmentAudios.length) {
            const currentAudioData = this.currentSegmentAudios[this.currentPosition];
            if (currentAudioData && currentAudioData.duration) {
                currentAudioSegmentDuration = currentAudioData.duration;
            }
        }
        
        // Calculate which display segments correspond to the current audio segment
        const totalAudioSegments = this.textSegments.length;
        const totalDisplaySegments = this.displaySegments.length;
        const displaySegmentsPerAudioSegment = totalDisplaySegments / totalAudioSegments;
        
        // Find the range of display segments for the current audio segment
        const audioSegmentStartDisplayIndex = Math.floor(this.currentPosition * displaySegmentsPerAudioSegment);
        const audioSegmentEndDisplayIndex = Math.floor((this.currentPosition + 1) * displaySegmentsPerAudioSegment);
        const displaySegmentsInCurrentAudio = audioSegmentEndDisplayIndex - audioSegmentStartDisplayIndex;
        
        // Calculate progress within the current audio segment's display segments
        let targetDisplaySegmentIndex = audioSegmentStartDisplayIndex;
        if (currentAudioSegmentDuration > 0 && displaySegmentsInCurrentAudio > 0) {
            // Add a small timing offset to hit the middle ground between early and late
            // This advances the highlighting by about 10% of a display segment's worth of time
            const timingOffset = (currentAudioSegmentDuration / displaySegmentsInCurrentAudio) * 0.1;
            const adjustedElapsed = currentAudioSegmentElapsed + timingOffset;
            
            const progressWithinAudioSegment = Math.min(Math.max(0, adjustedElapsed / currentAudioSegmentDuration), 1);
            const displaySegmentOffset = Math.floor(progressWithinAudioSegment * displaySegmentsInCurrentAudio);
            targetDisplaySegmentIndex = audioSegmentStartDisplayIndex + displaySegmentOffset;
        }
        
        // Ensure we stay within bounds
        const clampedIndex = Math.min(Math.max(0, targetDisplaySegmentIndex), totalDisplaySegments - 1);
        
        // Only update if we've moved to a different segment
        if (clampedIndex !== this.currentDisplaySegmentIndex) {
            console.log(`📜 Moving highlight from segment ${this.currentDisplaySegmentIndex} to ${clampedIndex}`);
            console.log(`📜 Audio segment ${this.currentPosition}: ${currentAudioSegmentElapsed.toFixed(1)}s / ${currentAudioSegmentDuration.toFixed(1)}s (with timing offset)`);
            console.log(`📜 Display range: ${audioSegmentStartDisplayIndex}-${audioSegmentEndDisplayIndex} (${displaySegmentsInCurrentAudio} segments)`);
            this.currentDisplaySegmentIndex = clampedIndex;
            this.updateDisplaySegmentHighlight(clampedIndex);
        }
    }

    updateDisplaySegmentHighlight(targetIndex) {
        const scrollingTextContainer = document.getElementById('audioScrollingTextContent');
        if (!scrollingTextContainer) return;
        
        // Remove previous highlights
        document.querySelectorAll('.current-segment').forEach(el => {
            el.classList.remove('current-segment');
        });

        // Highlight the target display segment
        const targetSegment = scrollingTextContainer.querySelector(`[data-display-segment="${targetIndex}"]`);
        if (targetSegment) {
            targetSegment.classList.add('current-segment');
            
            // Always snap to the new highlighted section when it changes
            const scrollContainer = document.getElementById('audioScrollingText');
            if (scrollContainer) {
                const segmentTop = targetSegment.offsetTop;
                const segmentHeight = targetSegment.offsetHeight;
                const containerHeight = scrollContainer.clientHeight;
                
                // Calculate scroll position to position the segment near the top of the container
                // with a small offset for better visibility
                const scrollTop = Math.max(0, segmentTop - 40);
                
                scrollContainer.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
                
                // Reset manual scrolling flag since this is an intentional snap
                this.isManuallyScrolling = false;
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = null;
                }
            }
            
            console.log(`📜 Highlighted display segment ${targetIndex} and snapped to position`);
        } else {
            console.warn(`📜 Could not find display segment ${targetIndex} to highlight`);
        }
    }

    findDisplaySegmentsForAudioSegment(audioSegmentText, audioSegmentIndex) {
        if (!this.displaySegments || !audioSegmentText) return [];

        // Get the first few words of the audio segment for matching
        const audioWords = audioSegmentText.trim().split(/\s+/).filter(word => word.trim().length > 0);
        const searchWords = audioWords.slice(0, Math.min(10, audioWords.length)); // Use first 10 words for matching
        const searchText = searchWords.join(' ').toLowerCase();

        // Find display segment that contains the beginning of the audio segment
        for (let i = 0; i < this.displaySegments.length; i++) {
            const displaySegment = this.displaySegments[i];
            const displayText = displaySegment.text.toLowerCase();
            
            // Check if this display segment contains the start of our audio segment
            if (displayText.includes(searchText.substring(0, 50))) { // Match first 50 chars
                console.log(`📜 Found matching display segment ${i} for audio segment ${audioSegmentIndex}`);
                return [i]; // Return only ONE segment to highlight
            }
        }

        // If no exact match found, fall back to estimated position based on audio segment index
        // Calculate which display segment should correspond to this audio segment
        const estimatedDisplaySegmentIndex = Math.floor(audioSegmentIndex * (this.displaySegments.length / this.textSegments.length));
        const clampedIndex = Math.min(estimatedDisplaySegmentIndex, this.displaySegments.length - 1);
        
        console.log(`📜 Used estimated position for audio segment ${audioSegmentIndex}: display segment ${clampedIndex}`);
        return [clampedIndex]; // Return only ONE segment to highlight
    }

    highlightTextInContent(text) {
        const textContent = document.getElementById('textContent');
        if (!textContent) return;

        // Find the text in the content and highlight it
        const walker = document.createTreeWalker(
            textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const searchText = text.substring(0, 50); // First 50 chars for matching
        let node;
        
        while (node = walker.nextNode()) {
            if (node.textContent.includes(searchText)) {
                const parent = node.parentElement;
                if (parent && !parent.classList.contains('audio-highlight')) {
                    parent.classList.add('audio-highlight');
                    parent.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    break;
                }
            }
        }
    }

    onChapterComplete() {
        this.stopAudio();
        
        const shouldContinue = confirm('Chapter complete! Would you like to continue to the next chapter?');
        if (shouldContinue) {
            this.bookReader.nextChapter();
        }
    }

    updatePlayButton(isPlaying) {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    updateProgress(percentage, currentSeconds = null) {
        const progressFill = document.getElementById('audioProgressFill');
        const currentTime = document.getElementById('audioCurrentTime');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        
        if (currentTime && currentSeconds !== null) {
            currentTime.textContent = this.formatTime(Math.floor(currentSeconds));
        }
    }

    parseTimeString(timeString) {
        const parts = timeString.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    toggleAudioSettings() {
        const panel = document.getElementById('audioSettingsPanel');
        panel.classList.toggle('open');
        this.updateCacheSize();
    }

    closeAudioSettings() {
        const panel = document.getElementById('audioSettingsPanel');
        panel.classList.remove('open');
    }

    toggleExpandedView() {
        const audioPanel = document.getElementById('audiobookPanel');
        const expandIcon = document.querySelector('.expand-icon');
        const collapseIcon = document.querySelector('.collapse-icon');
        const expandBtn = document.getElementById('audioExpandBtn');
        const isExpanded = audioPanel.classList.contains('audio-expanded');

        console.log('🎯 Toggling expanded view, currently expanded:', isExpanded);

        if (isExpanded) {
            // Collapse view
            audioPanel.classList.remove('audio-expanded');
            expandIcon.classList.remove('hidden');
            collapseIcon.classList.add('hidden');
            document.body.classList.remove('audio-fullscreen-mode');
            
            // Remove escape key listener
            if (this.escapeKeyHandler) {
                document.removeEventListener('keydown', this.escapeKeyHandler);
                this.escapeKeyHandler = null;
            }
            
            console.log('📱 Collapsed audio view');
        } else {
            // Expand view
            audioPanel.classList.add('audio-expanded');
            expandIcon.classList.add('hidden');
            collapseIcon.classList.remove('hidden');
            document.body.classList.add('audio-fullscreen-mode');
            
            // Add escape key listener
            this.escapeKeyHandler = (e) => {
                if (e.key === 'Escape') {
                    this.toggleExpandedView();
                }
            };
            document.addEventListener('keydown', this.escapeKeyHandler);
            
            console.log('🔍 Expanded audio view');
        }
    }

    async clearAudioCache() {
        // Clean up blob URLs to prevent memory leaks
        this.audioCache.forEach((segments) => {
            segments.forEach((segment) => {
                if (segment && segment.url) {
                    URL.revokeObjectURL(segment.url);
                }
            });
        });
        
        // Clear local cache
        this.audioCache.clear();
        
        // Clear Supabase cache for current chapter
        try {
            const cacheKey = this.getCacheKey();
            await DatabaseService.clearAudioCache(cacheKey.split('-').slice(0, -2).join('-')); // Clear by book-chapter pattern
            console.log('✅ Cleared Supabase audio cache');
        } catch (error) {
            console.warn('⚠️ Error clearing Supabase cache:', error);
        }
        
        this.updateCacheSize();
        console.log('Audio cache cleared');
    }

    async updateCacheSize() {
        const cacheSize = document.getElementById('cacheSize');
        if (cacheSize) {
            let totalSegments = 0;
            this.audioCache.forEach((segments) => {
                totalSegments += segments.filter(s => s !== null).length;
            });
            
            // Also get Supabase cache stats
            try {
                const stats = await DatabaseService.getAudioCacheStats();
                if (stats.total > 0) {
                    cacheSize.textContent = `${totalSegments} local + ${stats.total} cloud`;
                } else {
                    cacheSize.textContent = totalSegments.toString();
                }
            } catch (error) {
                // If Supabase stats fail, just show local count
                cacheSize.textContent = totalSegments.toString();
            }
        }
    }

    loadAudioSettings() {
        const saved = localStorage.getItem('aristoAudioSettings');
        if (saved) {
            try {
                const parsedSettings = JSON.parse(saved);
                
                // Validate settings to prevent invalid data
                if (parsedSettings.voice && typeof parsedSettings.voice !== 'string') {
                    console.warn('⚠️ Invalid voice setting detected, resetting to default');
                    parsedSettings.voice = 'alloy';
                }
                
                if (parsedSettings.model && typeof parsedSettings.model !== 'string') {
                    console.warn('⚠️ Invalid model setting detected, resetting to default');
                    parsedSettings.model = 'tts-1';
                }
                
                this.settings = { ...this.settings, ...parsedSettings };
                console.log('✅ Loaded audio settings:', this.settings);
                this.applyAudioSettings();
            } catch (error) {
                console.error('❌ Error loading audio settings, using defaults:', error);
                // Clear corrupted data
                localStorage.removeItem('aristoAudioSettings');
            }
        }
    }

    saveAudioSettings() {
        try {
            localStorage.setItem('aristoAudioSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving audio settings:', error);
        }
    }

    applyAudioSettings() {
        const elements = {
            voiceSelect: document.getElementById('voiceSelect'),
            modelSelect: document.getElementById('modelSelect'),
            playbackRateSlider: document.getElementById('playbackRateSlider'),
            playbackRateDisplay: document.getElementById('playbackRateDisplay'),
            volumeSlider: document.getElementById('volumeSlider'),
            volumeDisplay: document.getElementById('volumeDisplay')
        };

        if (elements.voiceSelect) {
            elements.voiceSelect.value = this.settings.voice || 'alloy';
        }

        if (elements.modelSelect) {
            elements.modelSelect.value = this.settings.model || 'tts-1';
        }

        if (elements.playbackRateSlider) {
            elements.playbackRateSlider.value = this.settings.playbackRate;
        }

        if (elements.playbackRateDisplay) {
            elements.playbackRateDisplay.textContent = this.settings.playbackRate + 'x';
        }

        if (elements.volumeSlider) {
            elements.volumeSlider.value = this.settings.volume;
        }

        if (elements.volumeDisplay) {
            elements.volumeDisplay.textContent = Math.round(this.settings.volume * 100) + '%';
        }
    }

    // Helper methods for blob/base64 conversion
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data URL prefix (data:audio/mp3;base64,)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64Data, contentType = 'audio/mp3') {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: contentType });
    }

    // Public methods for integration
    getCurrentSettings() {
        return { ...this.settings };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applyAudioSettings();
        this.saveAudioSettings();
        
        // Clear cache if voice or model changed
        if (newSettings.voice || newSettings.model) {
            this.clearAudioCache();
        }
    }

    // Debugging methods
    debugAudioState() {
        console.log('=== AUDIO DEBUG STATE ===');
        console.log('AI Audio Enabled:', this.aiAudioEnabled);
        console.log('Current Segment Audios:', this.currentSegmentAudios?.length || 0);
        console.log('Is Playing:', this.isPlaying);
        console.log('Is Paused:', this.isPaused);
        console.log('Current Position:', this.currentPosition);
        console.log('Audio Cache Size:', this.audioCache.size);
        console.log('Current Audio:', !!this.currentAudio);
        console.log('Play Button Disabled:', document.getElementById('audioPlayPauseBtn')?.disabled);
        console.log('Text Segments:', this.textSegments?.length || 0);
        console.log('Settings:', this.settings);
        console.log('=== END DEBUG ===');
    }

    // Test method to force audio generation
    async testAudioGeneration() {
        console.log('🧪 Testing audio generation...');
        try {
            const testText = "This is a test audio generation.";
            const audioBlob = await this.generateSegmentAudio(testText);
            console.log('✅ Test audio generated successfully:', audioBlob.size, 'bytes');
            
            // Try to play it
            const audioUrl = URL.createObjectURL(audioBlob);
            const testAudio = new Audio(audioUrl);
            
            // Test if audio can play
            console.log('🧪 Testing audio playback...');
            try {
                await testAudio.play();
                console.log('✅ Test audio playing successfully');
                
                // Stop after 2 seconds
                setTimeout(() => {
                    testAudio.pause();
                    testAudio.currentTime = 0;
                    URL.revokeObjectURL(audioUrl);
                    console.log('✅ Test audio stopped and cleaned up');
                }, 2000);
                
            } catch (playError) {
                console.error('❌ Test audio play failed:', playError);
                console.error('This might be a browser autoplay policy issue');
                URL.revokeObjectURL(audioUrl);
                
                // Try to play with user interaction
                console.log('🔍 Browser autoplay policies might be blocking audio');
                console.log('🔍 Try clicking the play button after this test');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Test audio generation failed:', error);
            return false;
        }
    }

    // Test current audio segments
    testCurrentAudioSegments() {
        console.log('🧪 Testing current audio segments...');
        console.log('Total segments:', this.currentSegmentAudios?.length || 0);
        
        this.currentSegmentAudios?.forEach((audioData, index) => {
            console.log(`Segment ${index}:`, {
                hasData: !!audioData,
                hasAudio: !!audioData?.audio,
                audioType: typeof audioData?.audio,
                isHTMLAudioElement: audioData?.audio instanceof HTMLAudioElement,
                duration: audioData?.duration,
                url: audioData?.url?.substring(0, 50) + '...' || 'N/A'
            });
        });
        
        // Try to play first valid segment
        const validSegment = this.currentSegmentAudios?.find(s => s?.audio instanceof HTMLAudioElement);
        if (validSegment) {
            console.log('🧪 Testing first valid audio segment...');
            try {
                validSegment.audio.play()
                    .then(() => {
                        console.log('✅ Direct audio play successful');
                        setTimeout(() => {
                            validSegment.audio.pause();
                            validSegment.audio.currentTime = 0;
                        }, 1000);
                    })
                    .catch(err => {
                        console.error('❌ Direct audio play failed:', err);
                    });
            } catch (error) {
                console.error('❌ Audio play test error:', error);
            }
        } else {
            console.warn('❌ No valid audio segments found');
        }
    }

    // Test cache functionality
    async testCacheStatus() {
        console.log('🧪 Testing cache status...');
        const cacheKey = this.getCacheKey();
        
        // Check local cache
        const hasLocalCache = this.audioCache.has(cacheKey);
        console.log('Local cache exists:', hasLocalCache);
        
        // Check Supabase cache
        try {
            const supabaseCache = await DatabaseService.getCachedAudio(cacheKey);
            console.log('Supabase cache exists:', !!supabaseCache);
            if (supabaseCache) {
                console.log('Supabase cache details:', {
                    voice: supabaseCache.voice,
                    model: supabaseCache.model,
                    created: supabaseCache.created_at,
                    dataSize: supabaseCache.audio_data?.length || 0
                });
            }
        } catch (error) {
            console.error('Error checking Supabase cache:', error);
        }
        
        // List all local cache keys
        console.log('All local cache keys:', Array.from(this.audioCache.keys()));
    }

    // Cleanup method
    cleanup() {
        this.clearAudioCache();
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    }
}

// Export for use in main app
window.AudiobookReader = AudiobookReader;
