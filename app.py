from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
