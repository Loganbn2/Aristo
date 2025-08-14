/**
 * Audio UI Helper for Notes and Highlights
 * Adds audio buttons and functionality to notes and highlights in the user interface
 */
class AudioUIHelper {
    constructor() {
        this.audioUtility = null;
        this.init();
    }

    async init() {
        // Wait for AudioUtility to be available
        if (typeof window.AudioUtility !== 'undefined') {
            this.audioUtility = window.AudioUtility;
        } else {
            // Wait for AudioUtility to be loaded
            await new Promise((resolve) => {
                const checkAudioUtility = () => {
                    if (typeof window.AudioUtility !== 'undefined') {
                        this.audioUtility = window.AudioUtility;
                        resolve();
                    } else {
                        setTimeout(checkAudioUtility, 100);
                    }
                };
                checkAudioUtility();
            });
        }

        console.log('🎵 AudioUIHelper initialized with AudioUtility');
    }

    /**
     * Add audio button to a highlight element in the text bubble
     * @param {string} highlightId - The highlight ID
     * @param {string} content - The highlight content to convert to audio
     * @param {HTMLElement} container - The container to add the audio button to
     */
    addHighlightAudioButton(highlightId, content, container) {
        if (!this.audioUtility) {
            console.warn('⚠️ AudioUIHelper: AudioUtility not available');
            return;
        }

        // Check if audio button already exists
        if (container.querySelector('.audio-highlight-btn')) {
            return;
        }

        // Create audio button container
        const audioContainer = document.createElement('div');
        audioContainer.className = 'audio-button-container';
        audioContainer.style.cssText = `
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;

        // Create audio button
        const audioButton = document.createElement('button');
        audioButton.className = 'audio-highlight-btn';
        audioButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span class="btn-text">Listen to Highlight</span>
        `;
        audioButton.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
        `;

        // Create loading indicator
        const loadingIndicator = document.createElement('span');
        loadingIndicator.className = 'audio-loading-indicator';
        loadingIndicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            Generating audio...
        `;
        loadingIndicator.style.cssText = `
            display: none;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-color);
            opacity: 0.7;
        `;

        // Add CSS animation for spinner
        if (!document.querySelector('#audio-spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'audio-spinner-styles';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        // Add button event listener
        audioButton.addEventListener('click', async () => {
            try {
                // Show loading state
                audioButton.style.display = 'none';
                loadingIndicator.style.display = 'flex';

                // Generate and play audio
                const audioObject = await this.audioUtility.generateHighlightAudio(highlightId, content);
                
                if (audioObject) {
                    await audioObject.play();
                    
                    // Update button to show play/pause controls
                    audioButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                        <span class="btn-text">Pause Audio</span>
                    `;
                    audioButton.onclick = () => {
                        audioObject.pause();
                        this.resetAudioButton(audioButton);
                    };

                    // Reset button when audio ends
                    audioObject.audio.addEventListener('ended', () => {
                        this.resetAudioButton(audioButton);
                    });
                } else {
                    throw new Error('Failed to generate audio');
                }

            } catch (error) {
                console.error('❌ Error playing highlight audio:', error);
                alert('Failed to generate audio for this highlight. Please try again.');
            } finally {
                // Hide loading state
                loadingIndicator.style.display = 'none';
                audioButton.style.display = 'flex';
            }
        });

        // Add hover effects
        audioButton.addEventListener('mouseenter', () => {
            audioButton.style.transform = 'translateY(-1px)';
            audioButton.style.boxShadow = '0 4px 8px rgba(0, 102, 204, 0.3)';
        });

        audioButton.addEventListener('mouseleave', () => {
            audioButton.style.transform = 'translateY(0)';
            audioButton.style.boxShadow = 'none';
        });

        // Add elements to container
        audioContainer.appendChild(audioButton);
        audioContainer.appendChild(loadingIndicator);
        container.appendChild(audioContainer);

        console.log(`🎵 Added audio button to highlight ${highlightId}`);
    }

    /**
     * Add audio button to a note in the note details bubble
     * @param {string} noteId - The note ID
     * @param {string} content - The note content to convert to audio
     * @param {HTMLElement} container - The container to add the audio button to
     */
    addNoteAudioButton(noteId, content, container) {
        if (!this.audioUtility) {
            console.warn('⚠️ AudioUIHelper: AudioUtility not available');
            return;
        }

        // Check if audio button already exists
        if (container.querySelector('.audio-note-btn')) {
            return;
        }

        // Create audio button container
        const audioContainer = document.createElement('div');
        audioContainer.className = 'audio-button-container';
        audioContainer.style.cssText = `
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;

        // Create audio button
        const audioButton = document.createElement('button');
        audioButton.className = 'audio-note-btn';
        audioButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span class="btn-text">Listen to Note</span>
        `;
        audioButton.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
        `;

        // Create loading indicator
        const loadingIndicator = document.createElement('span');
        loadingIndicator.className = 'audio-loading-indicator';
        loadingIndicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            Generating audio...
        `;
        loadingIndicator.style.cssText = `
            display: none;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-color);
            opacity: 0.7;
        `;

        // Add button event listener
        audioButton.addEventListener('click', async () => {
            try {
                // Show loading state
                audioButton.style.display = 'none';
                loadingIndicator.style.display = 'flex';

                // Generate and play audio
                const audioObject = await this.audioUtility.generateNoteAudio(noteId, content);
                
                if (audioObject) {
                    await audioObject.play();
                    
                    // Update button to show play/pause controls
                    audioButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                        <span class="btn-text">Pause Audio</span>
                    `;
                    audioButton.onclick = () => {
                        audioObject.pause();
                        this.resetNoteAudioButton(audioButton);
                    };

                    // Reset button when audio ends
                    audioObject.audio.addEventListener('ended', () => {
                        this.resetNoteAudioButton(audioButton);
                    });
                } else {
                    throw new Error('Failed to generate audio');
                }

            } catch (error) {
                console.error('❌ Error playing note audio:', error);
                alert('Failed to generate audio for this note. Please try again.');
            } finally {
                // Hide loading state
                loadingIndicator.style.display = 'none';
                audioButton.style.display = 'flex';
            }
        });

        // Add hover effects
        audioButton.addEventListener('mouseenter', () => {
            audioButton.style.transform = 'translateY(-1px)';
            audioButton.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.3)';
        });

        audioButton.addEventListener('mouseleave', () => {
            audioButton.style.transform = 'translateY(0)';
            audioButton.style.boxShadow = 'none';
        });

        // Add elements to container
        audioContainer.appendChild(audioButton);
        audioContainer.appendChild(loadingIndicator);
        container.appendChild(audioContainer);

        console.log(`🎵 Added audio button to note ${noteId}`);
    }

    /**
     * Add audio button to the note modal
     * @param {HTMLElement} noteModal - The note modal element
     */
    addNoteModalAudioButton(noteModal) {
        if (!this.audioUtility) {
            console.warn('⚠️ AudioUIHelper: AudioUtility not available');
            return;
        }

        const modalActions = noteModal.querySelector('.note-modal-actions');
        if (!modalActions || modalActions.querySelector('.audio-note-modal-btn')) {
            return;
        }

        // Create audio button
        const audioButton = document.createElement('button');
        audioButton.className = 'audio-note-modal-btn note-btn';
        audioButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            Listen to Selected Text
        `;
        audioButton.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #4CAF50;
            color: white;
            border-color: #4CAF50;
        `;

        // Insert before the save button
        const saveButton = modalActions.querySelector('#noteSaveBtn');
        if (saveButton) {
            modalActions.insertBefore(audioButton, saveButton);
        } else {
            modalActions.appendChild(audioButton);
        }

        // Add click handler
        audioButton.addEventListener('click', async () => {
            const selectedTextElement = document.getElementById('noteSelectedText');
            const selectedText = selectedTextElement?.textContent?.trim();

            if (!selectedText) {
                alert('No text selected to read aloud.');
                return;
            }

            try {
                audioButton.disabled = true;
                audioButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                    </svg>
                    Generating...
                `;

                // Generate temporary audio for the selected text
                const tempId = 'temp-' + Date.now();
                const audioObject = await this.audioUtility.generateNoteAudio(tempId, selectedText);
                
                if (audioObject) {
                    await audioObject.play();
                    
                    audioButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                        Pause Audio
                    `;
                    
                    const originalHandler = audioButton.onclick;
                    audioButton.onclick = () => {
                        audioObject.pause();
                        audioButton.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Listen to Selected Text
                        `;
                        audioButton.onclick = originalHandler;
                    };

                    // Reset when audio ends
                    audioObject.audio.addEventListener('ended', () => {
                        audioButton.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Listen to Selected Text
                        `;
                        audioButton.onclick = originalHandler;
                    });
                }

            } catch (error) {
                console.error('❌ Error playing selected text audio:', error);
                alert('Failed to generate audio. Please try again.');
            } finally {
                audioButton.disabled = false;
                if (audioButton.innerHTML.includes('Generating')) {
                    audioButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Listen to Selected Text
                    `;
                }
            }
        });

        console.log('🎵 Added audio button to note modal');
    }

    /**
     * Reset audio button to initial state
     * @private
     */
    resetAudioButton(button) {
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span class="btn-text">Listen to Highlight</span>
        `;
        
        // Restore original click handler
        button.onclick = button._originalHandler || (() => {});
    }

    /**
     * Reset note audio button to initial state
     * @private
     */
    resetNoteAudioButton(button) {
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span class="btn-text">Listen to Note</span>
        `;
        
        // Restore original click handler
        button.onclick = button._originalHandler || (() => {});
    }

    /**
     * Stop all audio playback
     */
    stopAllAudio() {
        if (this.audioUtility) {
            this.audioUtility.stopAll();
        }
    }
}

// Create global instance
window.AudioUIHelper = new AudioUIHelper();
