# AI Audio Generation Integration Example

## Option 2: AI-Generated Audio Integration

### Backend Integration (app.py)

```python
@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """Generate audio for chapter text using OpenAI TTS API"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        voice = data.get('voice', 'alloy')  # alloy, echo, fable, onyx, nova, shimmer
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        # OpenAI TTS API call
        response = openai_client.audio.speech.create(
            model="tts-1",  # or "tts-1-hd" for higher quality
            voice=voice,
            input=text,
            response_format="mp3"
        )
        
        # Save audio file temporarily or return base64
        import base64
        audio_base64 = base64.b64encode(response.content).decode('utf-8')
        
        return jsonify({
            'success': True,
            'audio_data': audio_base64,
            'format': 'mp3'
        })
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        return jsonify({'error': 'Failed to generate audio'}), 500

@app.route('/api/chapter-audio/<chapter_id>')
def get_chapter_audio(chapter_id):
    """Get or generate audio for a specific chapter"""
    # Implementation would check if audio exists, generate if not
    pass
```

### Frontend Integration

```javascript
class AIAudioReader extends AudiobookReader {
    constructor(bookReader) {
        super(bookReader);
        this.audioCache = new Map();
        this.currentAudioBlob = null;
    }

    async prepareChapterAudio() {
        const textContent = document.getElementById('textContent');
        if (!textContent) return;

        // Check if audio is already cached
        const cacheKey = `${this.bookReader.currentChapterId}`;
        if (this.audioCache.has(cacheKey)) {
            this.loadCachedAudio(cacheKey);
            return;
        }

        // Generate audio using AI
        await this.generateChapterAudio(textContent.textContent, cacheKey);
    }

    async generateChapterAudio(text, cacheKey) {
        try {
            // Show loading indicator
            this.showAudioGenerationProgress();
            
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: this.settings.aiVoice || 'alloy'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Convert base64 to blob
                const audioBlob = this.base64ToBlob(data.audio_data, 'audio/mp3');
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Cache the audio
                this.audioCache.set(cacheKey, {
                    url: audioUrl,
                    blob: audioBlob,
                    duration: await this.getAudioDuration(audioUrl)
                });
                
                this.loadCachedAudio(cacheKey);
            }
        } catch (error) {
            console.error('Error generating chapter audio:', error);
            // Fallback to TTS if AI generation fails
            super.prepareChapterAudio();
        } finally {
            this.hideAudioGenerationProgress();
        }
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    async getAudioDuration(audioUrl) {
        return new Promise((resolve) => {
            const audio = new Audio(audioUrl);
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.load();
        });
    }

    loadCachedAudio(cacheKey) {
        const cachedAudio = this.audioCache.get(cacheKey);
        if (cachedAudio) {
            this.currentAudioBlob = cachedAudio;
            this.setupAudioPlayer(cachedAudio.url);
            document.getElementById('audioPlayPauseBtn').disabled = false;
        }
    }

    setupAudioPlayer(audioUrl) {
        // Create HTML5 audio element for better control
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }

        this.audioElement = new Audio(audioUrl);
        this.audioElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audioElement.addEventListener('ended', () => {
            this.onChapterComplete();
        });
    }
}
```

## Option 3: ElevenLabs Integration

```python
# Backend with ElevenLabs
import requests

@app.route('/api/elevenlabs-audio', methods=['POST'])
def generate_elevenlabs_audio():
    try:
        data = request.get_json()
        text = data.get('text')
        voice_id = data.get('voice_id', 'pNInz6obpgDQGcFmaJgB')  # Adam voice
        
        ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            return jsonify({
                'success': True,
                'audio_data': audio_base64,
                'format': 'mp3'
            })
        else:
            return jsonify({'error': 'ElevenLabs API error'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```
