from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json
import openai
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize OpenAI client using environment variables
openai_client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')
)

# Sample book content
SAMPLE_BOOK = {
    "title": "The Art of Reading",
    "author": "Anonymous",
    "chapters": [
        {
            "id": 1,
            "title": "Chapter 1: The Beginning",
            "content": """In the quiet moments of dawn, when the world still sleeps and the first rays of sunlight pierce through the curtains, there exists a sacred ritual that has bound humanity together for centuries. It is the simple, yet profound act of reading.

Reading is not merely the mechanical process of decoding symbols on a page. It is an intimate conversation between the reader and the writer, a dance of minds across time and space. When we open a book, we open ourselves to new worlds, new perspectives, and new possibilities.

The pages before us hold the power to transport us to distant lands, introduce us to fascinating characters, and challenge our deepest beliefs. Each word is carefully chosen, each sentence crafted with intention, and each paragraph built to carry us forward on a journey of discovery.

In this digital age, where information flows like a rushing river and attention spans grow ever shorter, the art of deep reading becomes more precious than ever. To sit with a book, to lose oneself in its pages, to feel the weight of paper and ink in one's hands—this is a form of meditation, a return to our essential humanity.

The greatest books are those that change us, that leave us different from who we were when we first opened their covers. They challenge our assumptions, expand our empathy, and remind us of the vast complexity and beauty of the human experience.

As you embark on this reading journey, remember that each page turned is a step deeper into understanding—not just of the story before you, but of yourself and the world around you."""
        },
        {
            "id": 2,
            "title": "Chapter 2: The Journey Continues",
            "content": """The second chapter of any good book is where the real journey begins. The introductions have been made, the stage has been set, and now the true adventure unfolds before us like a map of unexplored territories.

In reading, as in life, it is not the destination that matters most, but the journey itself. Each sentence we encounter is a step along a path that winds through landscapes of thought and emotion. Some passages will challenge us with their complexity, others will comfort us with their familiarity, and still others will surprise us with their unexpected beauty.

The rhythm of reading is deeply personal. Some readers race through pages like runners in a marathon, eager to reach the finish line and discover how the story ends. Others prefer to stroll leisurely, savoring each word like a fine wine, allowing the language to settle on their palate and reveal its subtle flavors.

There is no wrong way to read, just as there is no wrong way to think or feel. The beauty of the written word lies in its ability to meet us wherever we are in our lives and speak to us in the language our hearts most need to hear.

As we continue through these pages together, take time to notice not just what you are reading, but how you are reading. Are you present with the words, or is your mind wandering? Are you questioning what you encounter, or accepting it without examination? Are you connecting this new knowledge to your existing understanding of the world?

The art of reading is also the art of questioning, of remaining curious and open to new ideas, even when they challenge our preconceptions. In this space between question and answer, between confusion and clarity, we find the true magic of the reading experience."""
        }
    ]
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/book')
def get_book():
    return jsonify(SAMPLE_BOOK)

@app.route('/api/book/chapter/<int:chapter_id>')
def get_chapter(chapter_id):
    chapter = next((ch for ch in SAMPLE_BOOK['chapters'] if ch['id'] == chapter_id), None)
    if chapter:
        return jsonify(chapter)
    return jsonify({'error': 'Chapter not found'}), 404

@app.route('/api/config')
def get_config():
    """Return public configuration for the frontend"""
    openai_key = os.getenv('OPENAI_API_KEY', '')
    # Consider OpenAI enabled only if we have a real API key (not placeholder)
    openai_enabled = bool(openai_key and openai_key != 'your-openai-api-key-here')
    
    return jsonify({
        'supabase': {
            'url': os.getenv('SUPABASE_URL'),
            'anonKey': os.getenv('SUPABASE_ANON_KEY')
        },
        'features': {
            'openai_enabled': openai_enabled,
            'ai_audio_enabled': openai_enabled  # Same as openai_enabled for TTS
        }
    })

@app.route('/api/aristo', methods=['POST'])
def ask_aristo():
    try:
        data = request.get_json()
        user_input = data.get('input', '').strip()
        chapter_context = data.get('chapterContext')
        
        if not user_input:
            return jsonify({'error': 'No input provided'}), 400
        
        # Load standard prompts
        try:
            with open('prompts.json', 'r') as f:
                prompts_data = json.load(f)
                standard_prompts = prompts_data['standard_prompts']
        except FileNotFoundError:
            return jsonify({'error': 'Prompts configuration not found'}), 500
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid prompts configuration'}), 500
        
        # Prepare messages for OpenAI
        messages = []
        
        # Add standard prompts and replace placeholder with user input and context
        for prompt in standard_prompts:
            if prompt['role'] == 'system':
                messages.append({
                    'role': 'system',
                    'content': prompt['content']
                })
            elif prompt['role'] == 'user':
                # Build the content with chapter context if available
                content = ""
                
                if chapter_context:
                    content += f"CURRENT READING CONTEXT:\n"
                    content += f"Chapter {chapter_context['chapterNumber']}: {chapter_context['title']}\n\n"
                    content += f"Chapter Content:\n{chapter_context['content']}\n\n"
                    content += f"---\n\n"
                
                # Replace placeholder with actual user input
                user_prompt = prompt['content'].replace('{user_input}', user_input)
                content += user_prompt
                
                messages.append({
                    'role': 'user',
                    'content': content
                })
        
        # Call OpenAI API
        try:
            response = openai_client.chat.completions.create(
                model=os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo'),
                messages=messages,
                max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '500')),
                temperature=float(os.getenv('OPENAI_TEMPERATURE', '0.7'))
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            print(f"=== ARISTO RESPONSE PARSING DEBUG ===")
            print(f"Raw AI response: {ai_response}")
            print(f"Response length: {len(ai_response)}")
            print(f"Response type: {type(ai_response)}")
            
            # Parse the JSON array response from Aristo
            try:
                parsed_response = json.loads(ai_response)
                print(f"Parsed response: {parsed_response}")
                print(f"Parsed response type: {type(parsed_response)}")
                print(f"Is list: {isinstance(parsed_response, list)}")
                print(f"List length: {len(parsed_response) if isinstance(parsed_response, list) else 'N/A'}")
                
                if isinstance(parsed_response, list) and len(parsed_response) >= 2:
                    # Extract the answer (first item) and label (second item)
                    answer = parsed_response[0]
                    label = parsed_response[1]
                    
                    print(f"Extracted answer: {answer}")
                    print(f"Extracted label: {label}")
                    print(f"Label type: {type(label)}")
                    print(f"Label is valid: {label in ['context', 'analysis']}")
                    
                    return jsonify({
                        'success': True,
                        'response': answer,  # Only return the answer to display
                        'label': label,      # Include label for backend use
                        'user_input': user_input
                    })
                else:
                    print(f"❌ Response not in expected format")
                    # Fallback if response isn't in expected format
                    return jsonify({
                        'success': True,
                        'response': ai_response,
                        'user_input': user_input,
                        'label': 'analysis',  # Provide default label
                        'note': 'Response not in expected JSON array format'
                    })
            except json.JSONDecodeError:
                print(f"❌ JSON decode error")
                # Fallback if response isn't valid JSON
                return jsonify({
                    'success': True,
                    'response': ai_response,
                    'user_input': user_input,
                    'label': 'analysis',  # Provide default label
                    'note': 'Response not in JSON format'
                })
            
        except Exception as openai_error:
            print(f"OpenAI API Error: {openai_error}")
            
            # Provide a fallback response when OpenAI is not available
            fallback_response = f"""I understand you're asking about: "{user_input}"

While I'd love to provide detailed AI-powered insights, it seems there's an issue connecting to the AI service right now. 

Here are some general reading strategies that might help:
• Try breaking down complex passages into smaller parts
• Look for key themes and main ideas
• Consider the context and background of what you're reading
• Make connections to your own experiences or other texts
• Don't hesitate to look up unfamiliar terms or concepts

Please check your OpenAI API configuration and try again for more personalized assistance."""
            
            return jsonify({
                'success': True,
                'response': fallback_response,
                'user_input': user_input,
                'label': 'analysis',  # Provide default label for fallback
                'fallback': True
            })
            
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/test_supabase.html')
def test_supabase():
    return render_template('test_supabase.html')

@app.route('/test_frontend.html')
def test_frontend():
    return render_template('test_frontend.html')

@app.route('/test_audio_persistence.html')
def test_audio_persistence():
    return render_template('test_audio_persistence.html')

@app.route('/api/find-relevant-text', methods=['POST'])
def find_relevant_text():
    """Find the most relevant text snippet from chapter content using AI"""
    print("=== FIND RELEVANT TEXT API CALLED ===")
    try:
        data = request.get_json()
        print(f"Received data keys: {list(data.keys()) if data else 'None'}")
        
        user_question = data.get('userQuestion', '').strip()
        aristo_response = data.get('aristoResponse', '').strip()
        chapter_content = data.get('chapterContent', '').strip()
        
        print(f"User question length: {len(user_question)}")
        print(f"Aristo response length: {len(aristo_response)}")
        print(f"Chapter content length: {len(chapter_content)}")
        
        if not all([user_question, aristo_response, chapter_content]):
            print("ERROR: Missing required data")
            return jsonify({'error': 'Missing required data'}), 400
        
        # Prepare the prompt for text selection
        selection_prompt = f"""You are helping to identify the most relevant text snippet from a chapter that relates to a user's question and an AI assistant's response.

USER'S QUESTION: {user_question}

AI ASSISTANT'S RESPONSE: {aristo_response}

CHAPTER CONTENT:
{chapter_content}

Your task is to find the most relevant text snippet from the chapter content that directly relates to both the user's question and the AI assistant's response. This text will be highlighted to show the connection.

Rules:
1. Select a continuous text snippet (not multiple separate pieces)
2. The snippet should be between 10-200 words
3. It should be the EXACT text as it appears in the chapter (maintain exact spelling, punctuation, and capitalization)
4. Choose text that most directly relates to what the user asked about and what the AI responded about
5. If multiple snippets are relevant, choose the most significant one
6. Respond with ONLY the selected text snippet, no additional commentary or quotation marks

Selected text snippet:"""

        try:
            print("Calling OpenAI API for text selection...")
            # Call OpenAI API for text selection
            response = openai_client.chat.completions.create(
                model=os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo'),
                messages=[
                    {
                        'role': 'user',
                        'content': selection_prompt
                    }
                ],
                max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '300')),
                temperature=0.3  # Lower temperature for more precise selection
            )
            
            selected_text = response.choices[0].message.content.strip()
            print(f"OpenAI selected text length: {len(selected_text)}")
            print(f"Selected text preview: {selected_text[:100]}...")
            
            # Validate that the selected text exists in the chapter content
            if selected_text in chapter_content:
                print("✅ Selected text found in chapter content")
                return jsonify({
                    'success': True,
                    'selectedText': selected_text
                })
            else:
                print("⚠️ Selected text not found exactly, trying fuzzy matching...")
                # Try to find a close match (in case of minor formatting differences)
                import difflib
                
                # Split chapter into sentences/phrases for fuzzy matching
                chapter_sentences = []
                for paragraph in chapter_content.split('\n\n'):
                    sentences = paragraph.split('. ')
                    chapter_sentences.extend(sentences)
                
                print(f"Split chapter into {len(chapter_sentences)} sentences")
                
                # Find best match
                best_match = difflib.get_close_matches(
                    selected_text, 
                    chapter_sentences, 
                    n=1, 
                    cutoff=0.6
                )
                
                if best_match:
                    print(f"✅ Found fuzzy match: {best_match[0][:100]}...")
                    return jsonify({
                        'success': True,
                        'selectedText': best_match[0].strip()
                    })
                else:
                    print("❌ No fuzzy match found")
                    return jsonify({
                        'success': False,
                        'error': 'AI selected text not found in chapter content'
                    })
            
        except Exception as openai_error:
            print(f"❌ OpenAI API Error in text selection: {openai_error}")
            
            # Fallback: Use simple keyword matching
            print("Trying fallback keyword matching...")
            fallback_text = find_fallback_relevant_text(user_question, chapter_content)
            
            if fallback_text:
                print(f"✅ Fallback found text: {fallback_text[:100]}...")
                return jsonify({
                    'success': True,
                    'selectedText': fallback_text,
                    'fallback': True
                })
            else:
                print("❌ Fallback also failed")
                return jsonify({
                    'success': False,
                    'error': 'Could not find relevant text with AI or fallback method'
                })
            
    except Exception as e:
        print(f"❌ Server Error in find_relevant_text: {e}")
        print(f"Error details: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def find_fallback_relevant_text(user_question, chapter_content):
    """Fallback method to find relevant text using keyword matching"""
    print("=== FALLBACK TEXT SELECTION START ===")
    try:
        import re
        
        # Extract key words from the user question (remove common words)
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'this', 'that', 'these', 'those'}
        
        question_words = [word.lower().strip('.,!?;:') for word in user_question.split() if word.lower() not in common_words and len(word) > 2]
        print(f"Extracted keywords: {question_words}")
        
        if not question_words:
            print("No keywords extracted from question")
            return None
        
        # Split chapter into sentences
        sentences = []
        for paragraph in chapter_content.split('\n\n'):
            para_sentences = re.split(r'[.!?]+', paragraph)
            sentences.extend([s.strip() for s in para_sentences if s.strip()])
        
        print(f"Split chapter into {len(sentences)} sentences")
        
        # Score sentences based on keyword matches
        best_sentence = ""
        best_score = 0
        
        for i, sentence in enumerate(sentences):
            if len(sentence) < 20:  # Skip very short sentences
                continue
                
            score = 0
            sentence_lower = sentence.lower()
            
            matched_words = []
            for word in question_words:
                if word in sentence_lower:
                    score += 1
                    matched_words.append(word)
            
            # Bonus for longer, more complete sentences
            if len(sentence) > 50:
                score += 0.5
            
            if score > best_score and score > 0:
                best_score = score
                best_sentence = sentence
                print(f"New best sentence (score {score}): {sentence[:100]}... (matched: {matched_words})")
        
        print(f"Final best sentence score: {best_score}")
        print("=== FALLBACK TEXT SELECTION END ===")
        return best_sentence if best_sentence else None
        
    except Exception as e:
        print(f"❌ Error in fallback text selection: {e}")
        return None

@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """Generate high-quality audio for text using OpenAI TTS API"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        voice = data.get('voice', 'alloy')  # alloy, echo, fable, onyx, nova, shimmer
        model = data.get('model', 'tts-1')  # tts-1 or tts-1-hd for higher quality
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        if len(text) > 4096:  # OpenAI TTS limit
            return jsonify({'error': 'Text too long. Maximum 4096 characters.'}), 400
            
        print(f"Generating audio for text length: {len(text)} characters with voice: {voice}")
        
        # OpenAI TTS API call
        response = openai_client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format="mp3"
        )
        
        # Convert to base64 for JSON response
        import base64
        audio_base64 = base64.b64encode(response.content).decode('utf-8')
        
        print(f"Audio generated successfully, size: {len(response.content)} bytes")
        
        return jsonify({
            'success': True,
            'audio_data': audio_base64,
            'format': 'mp3',
            'text_length': len(text),
            'voice': voice,
            'model': model
        })
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        return jsonify({
            'error': f'Failed to generate audio: {str(e)}',
            'fallback_available': True
        }), 500

@app.route('/api/debug')
def debug_info():
    """Debug endpoint to check configuration"""
    return jsonify({
        'env_vars': {
            'SUPABASE_URL': os.getenv('SUPABASE_URL'),
            'SUPABASE_ANON_KEY': os.getenv('SUPABASE_ANON_KEY')[:20] + '...' if os.getenv('SUPABASE_ANON_KEY') else None,
            'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY')[:20] + '...' if os.getenv('OPENAI_API_KEY') else None,
        },
        'config_response': {
            'supabase': {
                'url': os.getenv('SUPABASE_URL'),
                'anonKey': os.getenv('SUPABASE_ANON_KEY')
            },
            'features': {
                'openai_enabled': bool(os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_API_KEY') != 'your-openai-api-key-here'),
                'ai_audio_enabled': bool(os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_API_KEY') != 'your-openai-api-key-here')
            }
        }
    })

if __name__ == '__main__':
    # Use PORT environment variable for Render, fallback to FLASK_PORT for local dev
    port = int(os.getenv('PORT', os.getenv('FLASK_PORT', '5001')))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    app.run(
        debug=debug,
        port=port,
        host='0.0.0.0'  # Allow external connections for deployment
    )
