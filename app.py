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
            'openai_enabled': openai_enabled
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
            
            return jsonify({
                'success': True,
                'response': ai_response,
                'user_input': user_input
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
                'openai_enabled': bool(os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_API_KEY') != 'your-openai-api-key-here')
            }
        }
    })

if __name__ == '__main__':
    app.run(
        debug=os.getenv('FLASK_DEBUG', 'True').lower() == 'true',
        port=int(os.getenv('FLASK_PORT', '5001')),
        host='0.0.0.0'  # Allow external connections for deployment
    )
