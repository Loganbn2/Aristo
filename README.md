# Aristo
Study Buddy - A Modern Reading Experience

## Overview
Aristo is a web-based reading application designed to provide a comfortable, Kindle-like reading experience. Built with a Python Flask backend and modern JavaScript frontend, it offers customizable reading settings and an intuitive interface for digital books and texts.

## Features
- **Kindle-like Reading Interface**: Clean, distraction-free reading experience
- **Customizable Settings**: Adjust font size, line height, reading width, and themes
- **Multiple Themes**: Light, Sepia, and Dark modes for comfortable reading
- **Chapter Navigation**: Easy navigation between chapters with progress tracking
- **Table of Contents**: Quick access to any chapter
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Keyboard Shortcuts**: Ctrl+Arrow keys for chapter navigation, Esc to close panels
- **Progress Tracking**: Visual progress bar showing reading completion

## Technology Stack
- **Backend**: Python Flask with CORS support
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Fonts**: Crimson Text for reading, Inter for UI elements
- **Storage**: LocalStorage for user preferences

## Installation and Setup

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Steps
1. Clone or navigate to the project directory
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```bash
   python app.py
   ```
4. Open your browser and go to `http://localhost:5000`

## Usage
- Use the menu button (☰) to access the Table of Contents
- Use the settings button (⚙️) to customize your reading experience
- Navigate chapters using the Previous/Next buttons or Ctrl+Arrow keys
- Press Esc to close any open panels
- Your reading preferences are automatically saved

## Project Structure
```
/
├── app.py                 # Flask backend server
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── styles.css    # CSS styles and themes
│   └── js/
│       └── app.js        # JavaScript application logic
└── README.md
```

## API Endpoints
- `GET /` - Serves the main reading interface
- `GET /api/book` - Returns the complete book data
- `GET /api/book/chapter/<id>` - Returns specific chapter content

## Future Enhancements
- Support for multiple book formats (EPUB, PDF, TXT)
- Bookmarking and note-taking features
- Reading statistics and analytics
- User accounts and cloud synchronization
- Advanced search functionality
- Highlight and annotation tools
