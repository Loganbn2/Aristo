class BookReader {
    constructor() {
        this.availableBooks = []; // Store all available books
        this.currentBookId = null; // Will be set when we load a book
        this.currentChapterId = null;
        this.currentChapterNumber = 1;
        this.totalChapters = 0;
        this.book = null;
        this.chapterHighlights = new Map(); // Cache highlights per chapter
        this.settings = {
            fontSize: 18,
            lineHeight: 1.6,
            theme: 'light',
            width: 700
        };
        
        this.init();
    }

    async init() {
        await this.loadAvailableBooks();
        this.setupEventListeners();
        this.loadSettings();
        
        // Load the first book or last read book
        const lastBookId = localStorage.getItem('aristoLastBook');
        const bookToLoad = lastBookId && this.availableBooks.find(b => b.id === lastBookId) 
            ? lastBookId 
            : this.availableBooks[0]?.id;
            
        if (bookToLoad) {
            await this.loadBook(bookToLoad);
            await this.loadChapter(this.currentChapterNumber);
            this.updateProgress();
            
            // Debug highlight data
            await this.debugHighlightData();
        }
    }

    async loadAvailableBooks() {
        try {
            this.availableBooks = await DatabaseService.getBooks();
            this.populateBookSelector();
        } catch (error) {
            console.error('Error loading available books:', error);
        }
    }

    populateBookSelector() {
        const selector = document.getElementById('bookSelector');
        selector.innerHTML = '';
        
        if (this.availableBooks.length === 0) {
            selector.innerHTML = '<option value="">No books available</option>';
            return;
        }
        
        this.availableBooks.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = `${book.title} by ${book.author}`;
            selector.appendChild(option);
        });
        
        // Set the current book as selected
        if (this.currentBookId) {
            selector.value = this.currentBookId;
        }
    }

    async loadBook(bookId = null) {
        try {
            // For now, we'll assume there's at least one book in the database
            // Later you can add book selection functionality
            if (!bookId) {
                const books = await DatabaseService.getBooks();
                if (books.length === 0) {
                    console.error('No books found in database');
                    return;
                }
                bookId = books[0].id; // Use the first book
            }

            console.log('Loading book with ID:', bookId);
            this.book = await DatabaseService.getBook(bookId);
            this.currentBookId = bookId;
            this.totalChapters = this.book.chapters.length;
            
            // Sort chapters by chapter_number
            this.book.chapters.sort((a, b) => a.chapter_number - b.chapter_number);
            
            console.log('Loaded book:', this.book);
            console.log('Available chapters:', this.book.chapters.map(c => ({ id: c.id, number: c.chapter_number, title: c.title })));
            
            // Load reading progress
            await this.loadReadingProgress();
            
            // Update book title display
            this.updateBookDisplay();
            
            this.buildTableOfContents();
        } catch (error) {
            console.error('Error loading book:', error);
        }
    }

    updateBookDisplay() {
        if (this.book) {
            const bookTitleElement = document.getElementById('bookTitle');
            if (bookTitleElement) {
                bookTitleElement.textContent = this.book.title;
            }
            
            // Update the selector to show current selection
            const selector = document.getElementById('bookSelector');
            if (selector) {
                selector.value = this.currentBookId;
            }
        }
    }

    async loadReadingProgress() {
        try {
            const progress = await DatabaseService.getReadingProgress(this.currentBookId);
            if (progress) {
                this.currentChapterNumber = progress.current_chapter_number || 1;
                if (progress.reading_settings) {
                    this.settings = { ...this.settings, ...progress.reading_settings };
                }
            }
        } catch (error) {
            console.error('Error loading reading progress:', error);
        }
    }

    async saveReadingProgress() {
        try {
            await DatabaseService.updateReadingProgress(this.currentBookId, {
                current_chapter_id: this.currentChapterId,
                current_chapter_number: this.currentChapterNumber,
                progress_percentage: (this.currentChapterNumber / this.totalChapters) * 100,
                reading_settings: this.settings
            });
        } catch (error) {
            console.error('Error saving reading progress:', error);
        }
    }

    setupEventListeners() {
        // Menu and Settings panels
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.togglePanel('menuPanel');
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.togglePanel('settingsPanel');
        });

        document.getElementById('closeMenu').addEventListener('click', () => {
            this.closePanel('menuPanel');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closePanel('settingsPanel');
        });

        // Book selector
        document.getElementById('bookSelector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.switchBook(e.target.value);
            }
        });

        // Chapter navigation
        document.getElementById('prevChapter').addEventListener('click', () => {
            this.previousChapter();
        });

        document.getElementById('nextChapter').addEventListener('click', () => {
            this.nextChapter();
        });

        // Font size controls
        document.getElementById('decreaseFont').addEventListener('click', () => {
            this.changeFontSize(-2);
        });

        document.getElementById('increaseFont').addEventListener('click', () => {
            this.changeFontSize(2);
        });

        // Line height slider
        document.getElementById('lineHeightSlider').addEventListener('input', (e) => {
            this.changeLineHeight(e.target.value);
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeTheme(e.target.dataset.theme);
            });
        });

        // Width slider
        document.getElementById('widthSlider').addEventListener('input', (e) => {
            this.changeWidth(e.target.value);
        });

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            const menuPanel = document.getElementById('menuPanel');
            const settingsPanel = document.getElementById('settingsPanel');
            const menuBtn = document.getElementById('menuBtn');
            const settingsBtn = document.getElementById('settingsBtn');

            if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
                this.closePanel('menuPanel');
            }

            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                this.closePanel('settingsPanel');
            }
        });

        // Text bubble event listeners
        document.getElementById('textBubbleClose').addEventListener('click', () => {
            this.closeTextBubble();
        });

        document.getElementById('textBubbleOverlay').addEventListener('click', () => {
            this.closeTextBubble();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && e.ctrlKey) {
                e.preventDefault();
                this.previousChapter();
            } else if (e.key === 'ArrowRight' && e.ctrlKey) {
                e.preventDefault();
                this.nextChapter();
            } else if (e.key === 'Escape') {
                this.closePanel('menuPanel');
                this.closePanel('settingsPanel');
                this.closeTextBubble();
            }
        });
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        const otherPanelId = panelId === 'menuPanel' ? 'settingsPanel' : 'menuPanel';
        
        // Close other panel first
        this.closePanel(otherPanelId);
        
        // Toggle current panel
        panel.classList.toggle('open');
    }

    closePanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.classList.remove('open');
    }

    async loadChapter(chapterNumber) {
        try {
            const chapter = await DatabaseService.getChapterByNumber(this.currentBookId, chapterNumber);
            
            if (!chapter) {
                console.error('Chapter not found');
                return;
            }

            console.log('Loading chapter:', chapterNumber, 'with ID:', chapter.id);
            this.currentChapterId = chapter.id;
            this.currentChapterNumber = chapterNumber;

            // Load highlights for this chapter
            await this.loadChapterHighlights(chapter.id);

            // Update content
            const contentDiv = document.getElementById('textContent');
            contentDiv.innerHTML = this.formatChapterContent(chapter.content);
            
            // Set up highlight listeners
            this.setupHighlightListeners();
            
            // Update chapter title
            document.getElementById('chapterTitle').textContent = chapter.title;
            
            // Update navigation buttons
            this.updateNavigationButtons();
            
            // Update progress
            this.updateProgress();
            
            // Save reading progress
            await this.saveReadingProgress();
            
            // Scroll to top
            window.scrollTo(0, 0);
            
            // Update TOC active state
            this.updateTOCActiveState();
            
        } catch (error) {
            console.error('Error loading chapter:', error);
        }
    }

    async loadChapterHighlights(chapterId) {
        try {
            const highlights = await DatabaseService.getHighlights(this.currentBookId, chapterId);
            console.log('Loading highlights for chapter:', chapterId, highlights);
            
            // Convert highlights array to a map for easy lookup
            this.chapterHighlights.set(chapterId, new Map());
            const highlightMap = this.chapterHighlights.get(chapterId);
            
            highlights.forEach(highlight => {
                console.log('Processing highlight:', highlight);
                highlightMap.set(highlight.selected_text.toLowerCase(), {
                    id: highlight.id,
                    type: highlight.highlight_type,
                    typeName: this.getTypeDisplayName(highlight.highlight_type),
                    title: highlight.title,
                    content: highlight.content,
                    selectedText: highlight.selected_text
                });
            });
            
            console.log('Chapter highlights loaded:', highlightMap);
        } catch (error) {
            console.error('Error loading chapter highlights:', error);
        }
    }

    getTypeDisplayName(type) {
        switch(type) {
            case 'reader-notes': return 'Reader Notes';
            case 'aristo-context': return 'Context from Aristo';
            case 'aristo-analysis': return 'Analysis from Aristo';
            default: return 'Unknown';
        }
    }

    formatChapterContent(content) {
        // Split content into paragraphs and wrap each in a <p> tag
        let formattedContent = content
            .split('\n\n')
            .map(paragraph => `<p>${paragraph.trim()}</p>`)
            .join('');
        
        // Get highlights for current chapter
        const highlights = this.chapterHighlights.get(this.currentChapterId);
        console.log('Formatting content with highlights:', highlights);
        if (!highlights || highlights.size === 0) {
            console.log('No highlights found for chapter:', this.currentChapterId);
            return formattedContent;
        }

        // Create a map to track overlapping highlights
        const highlightMap = new Map();
        
        // First pass: identify all highlight positions
        highlights.forEach((highlight, term) => {
            // Escape special regex characters in the selected text
            const escapedText = highlight.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Use a more flexible regex that doesn't require word boundaries
            const regex = new RegExp(escapedText, 'gi');
            let match;
            
            console.log('Searching for highlight:', highlight.selectedText, 'with regex:', regex);
            
            while ((match = regex.exec(formattedContent)) !== null) {
                console.log('Found match:', match[0], 'at position:', match.index);
                const start = match.index;
                const end = start + match[0].length;
                const key = `${start}-${end}`;
                
                if (!highlightMap.has(key)) {
                    highlightMap.set(key, {
                        start,
                        end,
                        text: match[0],
                        highlights: []
                    });
                }
                
                highlightMap.get(key).highlights.push({
                    term: highlight.selectedText,
                    type: highlight.type,
                    data: highlight
                });
            }
        });
        
        // Sort highlights by position (reverse order for replacement)
        const sortedHighlights = Array.from(highlightMap.values())
            .sort((a, b) => b.start - a.start);
        
        console.log('Found highlights to apply:', sortedHighlights);
        
        // Apply highlights from end to beginning to maintain positions
        sortedHighlights.forEach(highlight => {
            const { start, end, text, highlights: highlightData } = highlight;
            
            if (highlightData.length === 1) {
                // Single highlight
                const { term, type } = highlightData[0];
                const replacement = `<span class="highlight ${type}" data-highlight="${term}" data-type="${type}">${text}</span>`;
                formattedContent = formattedContent.substring(0, start) + replacement + formattedContent.substring(end);
                console.log('Applied single highlight:', text, 'with type:', type);
            } else {
                // Multiple overlapping highlights
                const typeClasses = highlightData.map(h => h.type).join(' ');
                const terms = highlightData.map(h => h.term).join('|');
                const replacement = `<span class="highlight highlight-stack ${typeClasses}" data-highlight="${terms}" data-type="multiple">${text}</span>`;
                formattedContent = formattedContent.substring(0, start) + replacement + formattedContent.substring(end);
                console.log('Applied multiple highlights:', text, 'with types:', typeClasses);
            }
        });
        
        return formattedContent;
    }

    setupHighlightListeners() {
        // Add event listeners to all highlights
        document.querySelectorAll('.highlight').forEach(highlight => {
            highlight.addEventListener('click', (e) => {
                e.preventDefault();
                const highlightData = e.target.dataset.highlight;
                const type = e.target.dataset.type;
                
                if (type === 'multiple') {
                    // Handle multiple overlapping highlights
                    this.showMultipleHighlights(highlightData.split('|'));
                } else {
                    // Single highlight
                    this.showTextBubble(highlightData);
                }
            });
        });
    }

    showTextBubble(term) {
        const highlights = this.chapterHighlights.get(this.currentChapterId);
        const highlight = highlights?.get(term.toLowerCase());
        
        if (!highlight) return;

        const bubble = document.getElementById('textBubble');
        const overlay = document.getElementById('textBubbleOverlay');
        const title = document.getElementById('textBubbleTitle');
        const type = document.getElementById('textBubbleType');
        const content = document.getElementById('textBubbleContent');

        title.textContent = highlight.title;
        type.textContent = highlight.typeName;
        type.className = `text-bubble-type ${highlight.type}`;
        content.innerHTML = highlight.content;

        overlay.classList.add('show');
        bubble.classList.add('show');

        // Prevent body scrolling when bubble is open
        document.body.style.overflow = 'hidden';
    }

    showMultipleHighlights(terms) {
        const bubble = document.getElementById('textBubble');
        const overlay = document.getElementById('textBubbleOverlay');
        const title = document.getElementById('textBubbleTitle');
        const type = document.getElementById('textBubbleType');
        const content = document.getElementById('textBubbleContent');

        title.textContent = 'Multiple Highlights';
        type.textContent = 'Multiple Types';
        type.className = 'text-bubble-type';

        // Create content showing all highlights
        let multiContent = '<h1>Multiple Highlights Found</h1><p>This text has multiple types of annotations:</p>';
        
        const highlights = this.chapterHighlights.get(this.currentChapterId);
        
        terms.forEach(term => {
            const highlight = highlights?.get(term.toLowerCase());
            if (highlight) {
                multiContent += `
                    <div style="margin: 1.5rem 0; padding: 1rem; border-left: 4px solid ${this.getTypeColor(highlight.type)}; background: ${this.getTypeColor(highlight.type)}15;">
                        <h3 style="margin: 0 0 0.5rem 0;">${highlight.title}</h3>
                        <span style="font-size: 0.875rem; padding: 0.25rem 0.5rem; border-radius: 0.5rem; background: ${this.getTypeColor(highlight.type)}30; color: ${this.getTypeColor(highlight.type)};">${highlight.typeName}</span>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Click to view full content...</p>
                    </div>
                `;
            }
        });

        content.innerHTML = multiContent;

        // Add click handlers for each highlight section
        content.querySelectorAll('div[style*="border-left"]').forEach((div, index) => {
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                this.showTextBubble(terms[index]);
            });
        });

        overlay.classList.add('show');
        bubble.classList.add('show');

        // Prevent body scrolling when bubble is open
        document.body.style.overflow = 'hidden';
    }

    getTypeColor(type) {
        switch(type) {
            case 'reader-notes': return '#4CAF50';
            case 'aristo-context': return '#F44336';
            case 'aristo-analysis': return '#2196F3';
            default: return '#666';
        }
    }

    closeTextBubble() {
        const bubble = document.getElementById('textBubble');
        const overlay = document.getElementById('textBubbleOverlay');

        overlay.classList.remove('show');
        bubble.classList.remove('show');

        // Re-enable body scrolling
        document.body.style.overflow = 'auto';
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevChapter');
        const nextBtn = document.getElementById('nextChapter');
        
        prevBtn.disabled = this.currentChapterNumber <= 1;
        nextBtn.disabled = this.currentChapterNumber >= this.totalChapters;
    }

    updateProgress() {
        const progress = (this.currentChapterNumber / this.totalChapters) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }

    previousChapter() {
        if (this.currentChapterNumber > 1) {
            this.loadChapter(this.currentChapterNumber - 1);
        }
    }

    nextChapter() {
        if (this.currentChapterNumber < this.totalChapters) {
            this.loadChapter(this.currentChapterNumber + 1);
        }
    }

    buildTableOfContents() {
        const tocContainer = document.getElementById('tableOfContents');
        tocContainer.innerHTML = '';

        this.book.chapters.forEach(chapter => {
            const tocItem = document.createElement('div');
            tocItem.className = 'toc-item';
            tocItem.dataset.chapterNumber = chapter.chapter_number;
            
            const preview = chapter.content.substring(0, 100) + '...';
            
            tocItem.innerHTML = `
                <div class="toc-title">${chapter.title}</div>
                <div class="toc-preview">${preview}</div>
            `;
            
            tocItem.addEventListener('click', () => {
                this.loadChapter(chapter.chapter_number);
                this.closePanel('menuPanel');
            });
            
            tocContainer.appendChild(tocItem);
        });
    }

    updateTOCActiveState() {
        document.querySelectorAll('.toc-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.chapterNumber) === this.currentChapterNumber) {
                item.classList.add('active');
            }
        });
    }

    changeFontSize(delta) {
        this.settings.fontSize = Math.max(12, Math.min(24, this.settings.fontSize + delta));
        this.applySettings();
        this.saveSettings();
    }

    changeLineHeight(value) {
        this.settings.lineHeight = parseFloat(value);
        document.getElementById('lineHeightDisplay').textContent = value;
        this.applySettings();
        this.saveSettings();
    }

    changeTheme(theme) {
        this.settings.theme = theme;
        
        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
        
        this.applySettings();
        this.saveSettings();
    }

    changeWidth(value) {
        this.settings.width = parseInt(value);
        document.getElementById('widthDisplay').textContent = `${value}px`;
        this.applySettings();
        this.saveSettings();
    }

    applySettings() {
        const textContent = document.getElementById('textContent');
        const body = document.body;
        
        // Apply font size and line height
        textContent.style.fontSize = `${this.settings.fontSize}px`;
        textContent.style.lineHeight = this.settings.lineHeight;
        
        // Apply width
        textContent.style.maxWidth = `${this.settings.width}px`;
        
        // Apply theme
        body.setAttribute('data-theme', this.settings.theme);
        
        // Update displays
        document.getElementById('fontSizeDisplay').textContent = `${this.settings.fontSize}px`;
        document.getElementById('lineHeightSlider').value = this.settings.lineHeight;
        document.getElementById('lineHeightDisplay').textContent = this.settings.lineHeight;
        document.getElementById('widthSlider').value = this.settings.width;
        document.getElementById('widthDisplay').textContent = `${this.settings.width}px`;
    }

    loadSettings() {
        const saved = localStorage.getItem('aristoReaderSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('aristoReaderSettings', JSON.stringify(this.settings));
    }

    async switchBook(bookId) {
        try {
            // Save current reading progress before switching
            if (this.currentBookId && this.currentChapterId) {
                await this.saveReadingProgress();
            }
            
            // Load the new book
            await this.loadBook(bookId);
            
            // Start from chapter 1 or last read chapter
            const chapterToLoad = this.currentChapterNumber || 1;
            await this.loadChapter(chapterToLoad);
            
            // Update UI
            this.updateProgress();
            this.updateBookDisplay();
            
            // Store the selected book for next session
            localStorage.setItem('aristoLastBook', bookId);
            
        } catch (error) {
            console.error('Error switching book:', error);
        }
    }

    // Temporary debugging function
    async debugHighlightData() {
        console.log('=== DEBUG HIGHLIGHT DATA ===');
        console.log('Current book ID:', this.currentBookId);
        console.log('Current chapter ID:', this.currentChapterId);
        console.log('Current chapter number:', this.currentChapterNumber);
        
        // Get all highlights for current book
        try {
            const allHighlights = await DatabaseService.getHighlights(this.currentBookId);
            console.log('All highlights for current book:', allHighlights);
            
            // Get highlights for current chapter
            const chapterHighlights = await DatabaseService.getHighlights(this.currentBookId, this.currentChapterId);
            console.log('Highlights for current chapter:', chapterHighlights);
            
            // Check the specific highlight from your CSV
            const csvHighlight = {
                book_id: '2b154c7a-5485-483e-982e-8425ec7d67d6',
                chapter_id: '938f5fce-4637-4e2e-a1cc-6f484549132b',
                selected_text: 'An account of Lehi and his wife Sariah, and his four sons, being called, (beginning at the eldest) Laman, Lemuel, Sam, and Nephi.'
            };
            
            console.log('CSV highlight book ID matches current:', csvHighlight.book_id === this.currentBookId);
            console.log('CSV highlight chapter ID matches current:', csvHighlight.chapter_id === this.currentChapterId);
            
        } catch (error) {
            console.error('Error in highlight debugging:', error);
        }
        console.log('=== END DEBUG ===');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BookReader();
});
