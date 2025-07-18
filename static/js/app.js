class BookReader {
    constructor() {
        this.availableBooks = []; // Store all available books
        this.currentBookId = null; // Will be set when we load a book
        this.currentChapterId = null;
        this.currentChapterNumber = 1;
        this.totalChapters = 0;
        this.book = null;
        this.chapterHighlights = new Map(); // Cache highlights per chapter
        this.chapterNotes = new Map(); // Cache notes per chapter
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

        // Note modal event listeners
        document.getElementById('noteModalClose').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('noteModalOverlay').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('noteCancelBtn').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('noteSaveBtn').addEventListener('click', () => {
            this.saveNote();
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

        // Update margin tags on window resize and scroll
        window.addEventListener('resize', () => {
            if (this.marginTagUpdateTimeout) {
                clearTimeout(this.marginTagUpdateTimeout);
            }
            this.marginTagUpdateTimeout = setTimeout(() => {
                this.setupMarginTags();
                this.setupNoteIndicators(); // Update note indicators on resize
            }, 100);
        });

        window.addEventListener('scroll', () => {
            if (this.marginTagUpdateTimeout) {
                clearTimeout(this.marginTagUpdateTimeout);
            }
            this.marginTagUpdateTimeout = setTimeout(() => {
                this.setupMarginTags();
                this.setupNoteIndicators(); // Update note indicators on scroll
            }, 50);
        });
        
        // Additional robust event handling
        document.addEventListener('mouseup', (e) => {
            console.log('Document mouseup, checking selection...');
            setTimeout(() => {
                const sel = window.getSelection();
                console.log('Selection after mouseup:', sel.toString());
                this.updateFloatingCommentButton();
            }, 50);
        });
        
        // Handle keyboard selections too
        document.addEventListener('keyup', (e) => {
            if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                setTimeout(() => this.updateFloatingCommentButton(), 50);
            }
        });
        
        // Fallback: Check for selection every 500ms (for testing)
        this.selectionCheckInterval = setInterval(() => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
                console.log('Interval detected selection:', selection.toString().trim());
                this.updateFloatingCommentButton();
            }
        }, 500);
        
        console.log('Floating comment button setup complete');
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
            
            // Load notes for this chapter
            await this.loadChapterNotes(chapter.id);

            // Update content
            const contentDiv = document.getElementById('textContent');
            contentDiv.innerHTML = this.formatChapterContent(chapter.content);
            
            // Set up highlight listeners
            this.setupHighlightListeners();
            
            // Setup note indicators
            this.setupNoteIndicators();
            
            // Setup floating comment button after content is loaded
            this.setupFloatingCommentButton();
            
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
                const { term, type, data } = highlightData[0];
                const title = data.title || 'Highlight';
                const replacement = `<span class="highlight ${type}" data-highlight="${term}" data-type="${type}" data-title="${title}">${text}</span>`;
                formattedContent = formattedContent.substring(0, start) + replacement + formattedContent.substring(end);
                console.log('Applied single highlight:', text, 'with type:', type);
            } else {
                // Multiple overlapping highlights
                const typeClasses = highlightData.map(h => h.type).join(' ');
                const terms = highlightData.map(h => h.term).join('|');
                const titles = highlightData.map(h => h.data.title || 'Highlight').join(' | ');
                const replacement = `<span class="highlight highlight-stack ${typeClasses}" data-highlight="${terms}" data-type="multiple" data-title="${titles}">${text}</span>`;
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
        
        // Set up margin tags
        this.setupMarginTags();
    }

    setupMarginTags() {
        // Remove any existing margin tags
        document.querySelectorAll('.margin-tag').forEach(tag => tag.remove());
        
        const textContent = document.getElementById('textContent');
        const textRect = textContent.getBoundingClientRect();
        
        document.querySelectorAll('.highlight').forEach(highlight => {
            const title = highlight.dataset.title;
            const type = highlight.dataset.type;
            
            if (!title || type === 'multiple') return;
            
            // Create margin tag element
            const tag = document.createElement('div');
            tag.className = `margin-tag margin-tag-${type}`;
            tag.textContent = title;
            
            // Position the tag
            const highlightRect = highlight.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            tag.style.position = 'absolute';
            tag.style.top = (highlightRect.top + scrollTop + highlightRect.height / 2) + 'px';
            tag.style.zIndex = '10';
            tag.style.pointerEvents = 'none';
            tag.style.fontSize = '0.75rem';
            tag.style.fontWeight = '500';
            tag.style.padding = '0.25rem 0.5rem';
            tag.style.borderRadius = '0.25rem';
            tag.style.whiteSpace = 'nowrap';
            tag.style.opacity = '0.8';
            tag.style.transition = 'opacity 0.2s ease';
            tag.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            tag.style.fontFamily = 'Inter, sans-serif';
            
            // Position based on highlight type - all go on the left side now
            tag.style.right = (window.innerWidth - textRect.left + 20) + 'px';
            if (type === 'aristo-context') {
                tag.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
                tag.style.border = '1px solid rgba(244, 67, 54, 1)';
            } else {
                tag.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
                tag.style.border = '1px solid rgba(33, 150, 243, 1)';
            }
            tag.style.color = 'white';
            
            // Transform to center vertically
            tag.style.transform = 'translateY(-50%)';
            
            document.body.appendChild(tag);
            
            // Add hover effects
            highlight.addEventListener('mouseenter', () => {
                tag.style.opacity = '1';
            });
            highlight.addEventListener('mouseleave', () => {
                tag.style.opacity = '0.8';
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

    setupFloatingCommentButton() {
        console.log('Setting up floating comment button...');
        
        // Remove any existing floating comment button
        const existingBtn = document.querySelector('.floating-comment-btn');
        if (existingBtn) {
            console.log('Removing existing button');
            existingBtn.remove();
        }
        
        // Create the floating comment button
        const commentBtn = document.createElement('div');
        commentBtn.className = 'floating-comment-btn';
        commentBtn.title = 'Add a comment';
        
        console.log('Created button:', commentBtn);
        
        // Add click handler with multiple approaches
        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked!');
            console.log('Current selection exists:', !!this.currentSelection);
            try {
                this.handleCommentButtonClick();
            } catch (error) {
                console.error('Error in comment button click handler:', error);
            }
        };
        
        commentBtn.addEventListener('click', clickHandler);
        commentBtn.addEventListener('mousedown', clickHandler);
        commentBtn.addEventListener('touchstart', clickHandler);
        
        // Also make it focusable and add keyboard support
        commentBtn.setAttribute('tabindex', '0');
        commentBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler(e);
            }
        });
        
        // Append to body for fixed positioning
        document.body.appendChild(commentBtn);
        console.log('Button appended to body');
        
        this.floatingCommentBtn = commentBtn;
        
        // Check if button is in DOM
        setTimeout(() => {
            const checkBtn = document.querySelector('.floating-comment-btn');
            console.log('Button found after timeout:', checkBtn);
            if (checkBtn) {
                console.log('Button display style:', window.getComputedStyle(checkBtn).display);
                console.log('Button visibility:', window.getComputedStyle(checkBtn).visibility);
            }
        }, 100);
        
        // Setup event listeners for showing/hiding the button
        document.addEventListener('selectionchange', () => {
            console.log('Selection change event fired');
            this.updateFloatingCommentButton();
        });
        
        document.addEventListener('mouseup', (e) => {
            console.log('Document mouseup, checking selection...');
            setTimeout(() => {
                const sel = window.getSelection();
                console.log('Selection after mouseup:', sel.toString());
                this.updateFloatingCommentButton();
            }, 50);
        });
        
        // Handle keyboard selections too
        document.addEventListener('keyup', (e) => {
            if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                setTimeout(() => this.updateFloatingCommentButton(), 50);
            }
        });
        
        // Fallback: Check for selection every 500ms (for testing)
        this.selectionCheckInterval = setInterval(() => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
                console.log('Interval detected selection:', selection.toString().trim());
                this.updateFloatingCommentButton();
            }
        }, 500);
        
        console.log('Floating comment button setup complete');
    }

    // Clean up intervals when needed
    cleanup() {
        if (this.selectionCheckInterval) {
            clearInterval(this.selectionCheckInterval);
        }
    }

    updateFloatingCommentButton() {
        if (!this.floatingCommentBtn) {
            console.log('Button update failed - button not initialized');
            return;
        }
        
        const selection = window.getSelection();
        const textContent = document.getElementById('textContent');
        
        if (!selection || !textContent) {
            console.log('Button update failed - missing selection or textContent');
            return;
        }
        
        console.log('Selection update called, rangeCount:', selection.rangeCount, 'isCollapsed:', selection.isCollapsed);
        
        if (!selection.rangeCount || selection.isCollapsed) {
            this.floatingCommentBtn.classList.remove('show');
            console.log('Button hidden - no selection or collapsed');
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        console.log('Selected text:', `"${selectedText}"`, 'length:', selectedText.length);
        
        // Only show if there's meaningful text selected (reduced threshold)
        if (selectedText.length < 1) {
            this.floatingCommentBtn.classList.remove('show');
            console.log('Button hidden - no text selected');
            return;
        }
        
        // Check if selection is within text content area
        const ancestor = range.commonAncestorContainer;
        const isInTextArea = textContent.contains(ancestor) || textContent === ancestor;
        console.log('Selection in text area:', isInTextArea, 'ancestor:', ancestor.nodeName);
        
        if (!isInTextArea) {
            this.floatingCommentBtn.classList.remove('show');
            console.log('Button hidden - not in text content');
            return;
        }
        
        // Show the button at its fixed position
        this.floatingCommentBtn.classList.add('show');
        console.log('Button showing! Classes:', this.floatingCommentBtn.className);
        console.log('Button computed display:', window.getComputedStyle(this.floatingCommentBtn).display);
        
        // Store selection info for later use
        this.currentSelection = {
            text: selectedText,
            range: range.cloneRange()
        };
    }

    // Test function to force show the button (for debugging)
    testShowButton() {
        console.log('TEST: Forcing button to show');
        this.floatingCommentBtn.classList.add('show');
        console.log('TEST: Button classes after force show:', this.floatingCommentBtn.className);
        console.log('TEST: Button computed display:', window.getComputedStyle(this.floatingCommentBtn).display);
    }

    handleCommentButtonClick() {
        console.log('handleCommentButtonClick called');
        console.log('currentSelection:', this.currentSelection);
        
        if (!this.currentSelection) {
            console.log('No current selection, cannot open note modal');
            return;
        }
        
        try {
            // Hide the button
            this.floatingCommentBtn.classList.remove('show');
            console.log('Button hidden');
            
            // Open the note modal
            console.log('Opening note modal with text:', this.currentSelection.text);
            this.openNoteModal(this.currentSelection.text);
            
            // Clear the selection
            window.getSelection().removeAllRanges();
            console.log('Selection cleared');
            
        } catch (error) {
            console.error('Error in handleCommentButtonClick:', error);
        }
    }

    // Note functionality
    openNoteModal(selectedText) {
        console.log('openNoteModal called with text:', selectedText);
        
        const modal = document.getElementById('noteModal');
        const overlay = document.getElementById('noteModalOverlay');
        const selectedTextDisplay = document.getElementById('noteSelectedText');
        const textarea = document.getElementById('noteTextarea');
        
        console.log('Modal elements found:', {
            modal: !!modal,
            overlay: !!overlay,
            selectedTextDisplay: !!selectedTextDisplay,
            textarea: !!textarea
        });
        
        if (!modal || !overlay || !selectedTextDisplay || !textarea) {
            console.error('Note modal elements not found!');
            return;
        }
        
        try {
            // Display the selected text
            selectedTextDisplay.textContent = selectedText;
            console.log('Selected text set in modal');
            
            // Clear the textarea
            textarea.value = '';
            console.log('Textarea cleared');
            
            // Show the modal
            overlay.classList.add('show');
            modal.classList.add('show');
            console.log('Modal classes added, should be visible now');
            
            // Focus on the textarea
            setTimeout(() => {
                textarea.focus();
                console.log('Textarea focused');
            }, 100);
            
            // Prevent body scrolling
            document.body.style.overflow = 'hidden';
            console.log('Body scrolling disabled');
            
        } catch (error) {
            console.error('Error in openNoteModal:', error);
        }
    }
    
    closeNoteModal() {
        const modal = document.getElementById('noteModal');
        const overlay = document.getElementById('noteModalOverlay');
        
        overlay.classList.remove('show');
        modal.classList.remove('show');
        
        // Re-enable body scrolling
        document.body.style.overflow = 'auto';
        
        // Clear selection
        this.currentSelection = null;
    }
    
    async saveNote() {
        if (!this.currentSelection) {
            console.log('No current selection for note');
            return;
        }
        
        const textarea = document.getElementById('noteTextarea');
        const noteContent = textarea.value.trim();
        
        if (!noteContent) {
            alert('Please enter a note before saving.');
            return;
        }
        
        try {
            // Disable the save button while saving
            const saveBtn = document.getElementById('noteSaveBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            console.log('Preparing to save note:', {
                book_id: this.currentBookId,
                chapter_id: this.currentChapterId,
                selected_text: this.currentSelection.text,
                note_content: noteContent
            });
            
            // Create the note object
            const note = {
                book_id: this.currentBookId,
                chapter_id: this.currentChapterId,
                selected_text: this.currentSelection.text,
                note_content: noteContent,
                note_position: {
                    // Store position data for future use
                    startOffset: this.currentSelection.range.startOffset,
                    endOffset: this.currentSelection.range.endOffset,
                    startContainerPath: this.getNodePath(this.currentSelection.range.startContainer),
                    endContainerPath: this.getNodePath(this.currentSelection.range.endContainer)
                }
            };
            
            console.log('Calling DatabaseService.createNote with:', note);
            
            // Save to database
            const savedNote = await DatabaseService.createNote(note);
            console.log('Note saved successfully:', savedNote);
            
            // Update local cache
            if (!this.chapterNotes.has(this.currentChapterId)) {
                this.chapterNotes.set(this.currentChapterId, new Map());
            }
            const notesMap = this.chapterNotes.get(this.currentChapterId);
            notesMap.set(savedNote.id, savedNote);
            
            // Close the modal
            this.closeNoteModal();
            
            // Refresh note indicators
            this.setupNoteIndicators();
            
            // Show success message
            this.showToast('Note saved successfully!');
            
        } catch (error) {
            console.error('Detailed error saving note:', error);
            console.error('Error stack:', error.stack);
            console.error('Error message:', error.message);
            
            // Show more specific error message
            let errorMessage = 'Failed to save note. ';
            if (error.message) {
                if (error.message.includes('relation "notes" does not exist')) {
                    errorMessage += 'The notes table has not been created in your database. Please run the notes_table_schema.sql file in your Supabase SQL editor.';
                } else if (error.message.includes('permission denied')) {
                    errorMessage += 'Permission denied. Please check your Supabase Row Level Security settings.';
                } else if (error.message.includes('network')) {
                    errorMessage += 'Network error. Please check your internet connection and try again.';
                } else {
                    errorMessage += `Error: ${error.message}`;
                }
            } else {
                errorMessage += 'Please try again or check the console for more details.';
            }
            
            alert(errorMessage);
        } finally {
            // Re-enable the save button
            const saveBtn = document.getElementById('noteSaveBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Note';
            }
        }
    }
    
    async loadChapterNotes(chapterId) {
        try {
            console.log('Loading notes for chapter:', chapterId);
            const notes = await DatabaseService.getNotes(this.currentBookId, chapterId);
            console.log('Raw notes from database:', notes);
            
            // Store notes in cache
            this.chapterNotes.set(chapterId, new Map());
            const notesMap = this.chapterNotes.get(chapterId);
            
            notes.forEach(note => {
                console.log('Adding note to cache:', note.id, note);
                notesMap.set(note.id, note);
            });
            
            console.log('Chapter notes loaded into cache:', notesMap);
            console.log('Cache size:', notesMap.size);
        } catch (error) {
            console.error('Error loading chapter notes:', error);
        }
    }
    
    setupNoteIndicators() {
        console.log('=== SETTING UP NOTE INDICATORS ===');
        console.log('Current chapter ID:', this.currentChapterId);
        
        // Remove existing note indicators
        document.querySelectorAll('.note-indicator').forEach(indicator => indicator.remove());
        
        const notes = this.chapterNotes.get(this.currentChapterId);
        console.log('Notes for current chapter:', notes);
        
        if (!notes || notes.size === 0) {
            console.log('No notes found for this chapter');
            return;
        }
        
        const textContent = document.getElementById('textContent');
        if (!textContent) return;
        
        // Sort notes to prevent overlapping indicators
        const notesArray = Array.from(notes.values()).sort((a, b) => {
            const posA = this.findTextPosition(a.selected_text);
            const posB = this.findTextPosition(b.selected_text);
            if (!posA || !posB) return 0;
            return posA.top - posB.top;
        });
        
        console.log('Notes array to process:', notesArray);
        
        let lastIndicatorTop = -50; // Track last indicator position to prevent overlap
        
        notesArray.forEach((note, index) => {
            console.log(`Processing note ${index}:`, note);
            const position = this.findTextPosition(note.selected_text);
            console.log('Found position for note:', position);
            
            let indicatorTop;
            if (position) {
                indicatorTop = position.top + window.scrollY;
                console.log('Calculated indicatorTop from position:', indicatorTop);
                
                // Prevent overlapping indicators
                if (indicatorTop - lastIndicatorTop < 30) {
                    indicatorTop = lastIndicatorTop + 30;
                    console.log('Adjusted indicatorTop to prevent overlap:', indicatorTop);
                }
            } else {
                // Fallback: position based on order if text not found
                const textRect = textContent.getBoundingClientRect();
                indicatorTop = textRect.top + window.scrollY + (index * 40) + 50;
                console.log('Using fallback position:', indicatorTop);
            }
            
            const indicator = document.createElement('div');
            indicator.className = 'note-indicator right';
            indicator.title = `Note: ${note.note_content.substring(0, 50)}...`;
            indicator.style.position = 'fixed'; // Use fixed positioning for testing
            indicator.style.top = (200 + index * 40) + 'px'; // Move down from top
            indicator.style.right = '200px'; // Move closer to middle from right edge
            indicator.style.width = '24px';
            indicator.style.height = '24px';
            indicator.style.backgroundColor = '#4CAF50'; // Green color
            indicator.style.borderRadius = '50%';
            indicator.style.zIndex = '1000';
            indicator.style.cursor = 'pointer';
            indicator.style.border = '2px solid white';
            indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            indicator.style.display = 'flex';
            indicator.style.alignItems = 'center';
            indicator.style.justifyContent = 'center';
            indicator.style.fontSize = '18px';
            indicator.style.lineHeight = '1';
            indicator.style.color = 'white';
            indicator.style.fontWeight = 'bold';
            // Use SVG quote icon instead of text character
            indicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                </svg>
            `;
            
            console.log(`Created indicator at top: ${200 + index * 40}px, right: 200px`);
            
            // Add click handler to show note
            indicator.addEventListener('click', () => {
                this.showNoteDetails(note);
            });
            
            document.body.appendChild(indicator);
            lastIndicatorTop = indicatorTop;
            
            console.log('Indicator appended to body');
        });
        
        console.log('=== END NOTE INDICATORS SETUP ===');
    }
    
    findTextPosition(selectedText) {
        console.log('Finding position for text:', selectedText.substring(0, 50) + '...');
        
        // Find the position of the selected text in the content
        const textContent = document.getElementById('textContent');
        if (!textContent) {
            console.log('No textContent element found');
            return null;
        }
        
        // Create a temporary range to find the text
        const walker = document.createTreeWalker(
            textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            const index = text.indexOf(selectedText);
            
            if (index !== -1) {
                console.log('Found exact text match in node:', node);
                // Found the text, create a range to get its position
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + selectedText.length);
                
                const rect = range.getBoundingClientRect();
                console.log('Text rect:', rect);
                if (rect.height > 0) { // Make sure it's visible
                    const position = {
                        top: rect.top + (rect.height / 2), // Center of the text
                        left: rect.left,
                        right: rect.right
                    };
                    console.log('Returning position:', position);
                    return position;
                }
            }
        }
        
        console.log('Exact text not found, trying first few words...');
        // If exact match not found, try a fuzzy search for the first few words
        const firstWords = selectedText.split(' ').slice(0, 3).join(' ');
        if (firstWords !== selectedText && firstWords.length > 0) {
            console.log('Searching for first words:', firstWords);
            return this.findTextPosition(firstWords);
        }
        
        console.log('Text position not found');
        return null;
    }
    
    showNoteDetails(note) {
        // Use the existing text bubble to show note details
        const bubble = document.getElementById('textBubble');
        const overlay = document.getElementById('textBubbleOverlay');
        const title = document.getElementById('textBubbleTitle');
        const type = document.getElementById('textBubbleType');
        const content = document.getElementById('textBubbleContent');

        title.textContent = 'Your Note';
        type.textContent = 'Reader Note';
        type.className = 'text-bubble-type note-type';
        
        const noteDate = new Date(note.created_at).toLocaleDateString();
        content.innerHTML = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--hover-color); border-radius: 0.5rem;">
                <strong>Selected Text:</strong><br>
                <em>"${note.selected_text}"</em>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Your Note:</strong><br>
                ${note.note_content.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 0.875rem; opacity: 0.7;">
                Created: ${noteDate}
            </div>
        `;

        overlay.classList.add('show');
        bubble.classList.add('show');

        // Prevent body scrolling when bubble is open
        document.body.style.overflow = 'hidden';
    }
    
    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            z-index: 3000;
            font-family: 'Inter', sans-serif;
            font-size: 0.875rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    getNodePath(node) {
        // Helper function to get a path to a DOM node
        // This is a simplified version - you might want a more robust implementation
        const path = [];
        let current = node;
        
        while (current && current !== document.getElementById('textContent')) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const siblings = Array.from(current.parentNode.children);
                const index = siblings.indexOf(current);
                path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
            } else if (current.nodeType === Node.TEXT_NODE) {
                const siblings = Array.from(current.parentNode.childNodes);
                const index = siblings.indexOf(current);
                path.unshift(`text()[${index}]`);
            }
            current = current.parentNode;
        }
        
        return path.join('/');
    }

    // Test database connection and notes table
    async testDatabase() {
        console.log('=== DATABASE CONNECTION TEST ===');
        
        try {
            // Test basic Supabase connection
            console.log('1. Testing Supabase connection...');
            const books = await DatabaseService.getBooks();
            console.log('   Books loaded:', books.length, 'books found');
            
            // Test notes table access
            console.log('2. Testing notes table access...');
            const testNote = {
                book_id: this.currentBookId,
                chapter_id: this.currentChapterId,
                selected_text: 'Test selection for database test',
                note_content: 'This is a test note to check database connectivity',
                note_position: { test: true }
            };
            
            const savedNote = await DatabaseService.createNote(testNote);
            console.log('   Test note created successfully:', savedNote);
            
            // Clean up test note if we have a delete method
            if (DatabaseService.deleteNote) {
                await DatabaseService.deleteNote(savedNote.id);
                console.log('   Test note cleaned up');
            }
            
            console.log('✅ Database connection successful!');
            
        } catch (error) {
            console.error('❌ Database test failed:', error);
            console.error('Error details:', error.message);
            
            if (error.message.includes('relation "notes" does not exist')) {
                console.log('💡 Solution: Run the notes_table_schema.sql file in your Supabase SQL editor');
            } else if (error.message.includes('permission denied')) {
                console.log('💡 Solution: Check your Supabase Row Level Security settings');
            }
        }
        
        console.log('=== END DATABASE TEST ===');
    }

    // Comprehensive test function
    testCommentSystem() {
        console.log('=== COMMENT SYSTEM TEST ===');
        
        // Test 1: Check if button exists
        console.log('1. Button exists:', !!this.floatingCommentBtn);
        
        // Test 2: Check button properties
        if (this.floatingCommentBtn) {
            console.log('2. Button classes:', this.floatingCommentBtn.className);
            console.log('   Button display:', window.getComputedStyle(this.floatingCommentBtn).display);
            console.log('   Button pointer-events:', window.getComputedStyle(this.floatingCommentBtn).pointerEvents);
            console.log('   Button z-index:', window.getComputedStyle(this.floatingCommentBtn).zIndex);
        }
        
        // Test 3: Set up a fake selection
        this.currentSelection = {
            text: 'Test selection for debugging',
            range: { cloneRange: () => ({ startOffset: 0, endOffset: 10 }) }
        };
        console.log('3. Set fake selection:', this.currentSelection);
        
        // Test 4: Try to show button
        if (this.floatingCommentBtn) {
            this.floatingCommentBtn.classList.add('show');
            console.log('4. Forced button to show');
        }
        
        // Test 5: Test modal elements
        const modal = document.getElementById('noteModal');
        const overlay = document.getElementById('noteModalOverlay');
        console.log('5. Modal elements exist:', {
            modal: !!modal,
            overlay: !!overlay,
            selectedText: !!document.getElementById('noteSelectedText'),
            textarea: !!document.getElementById('noteTextarea')
        });
        
        // Test 6: Try opening modal directly
        try {
            this.openNoteModal('Test text for modal');
            console.log('6. Modal opened successfully');
        } catch (error) {
            console.error('6. Error opening modal:', error);
        }
        
        console.log('=== END TEST ===');
        console.log('To test button click: Try clicking the button now, or run window.bookReader.handleCommentButtonClick()');
   }

    // Manual test function to check notes
    async testNoteDisplay() {
        console.log('=== MANUAL NOTE TEST ===');
        console.log('Current book ID:', this.currentBookId);
        console.log('Current chapter ID:', this.currentChapterId);
        
        // Force reload notes
        await this.loadChapterNotes(this.currentChapterId);
        
        // Force setup indicators
        this.setupNoteIndicators();
        
        // Check if any indicators were created
        const indicators = document.querySelectorAll('.note-indicator');
        console.log('Number of indicators found:', indicators.length);
        
        indicators.forEach((indicator, index) => {
            console.log(`Indicator ${index}:`, {
                top: indicator.style.top,
                right: indicator.style.right,
                classes: indicator.className,
                visible: window.getComputedStyle(indicator).display !== 'none'
            });
        });
        
        console.log('=== END NOTE TEST ===');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookReader = new BookReader();
    console.log('BookReader initialized and available as window.bookReader');
});
