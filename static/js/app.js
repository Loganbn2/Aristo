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
        this.audiobookReader = null; // Initialize audiobook reader
        this.settings = {
            fontSize: 18,
            lineHeight: 1.6,
            theme: 'light',
            width: 700
        };
        
        // Don't call init() immediately - let the initialization happen externally
    }

    async init() {
        // Ensure Supabase is ready before loading books
        if (typeof ensureSupabaseReady === 'function') {
            await ensureSupabaseReady();
        }
        
        await this.loadAvailableBooks();
        this.setupEventListeners();
        this.loadSettings();
        
        // Initialize audiobook reader if available
        if (typeof AudiobookReader !== 'undefined') {
            this.audiobookReader = new AudiobookReader(this);
            // Make it globally accessible for debugging
            window.audiobookReader = this.audiobookReader;
            console.log('Audiobook reader initialized');
        }
        
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

        // Mobile settings button in menu panel
        document.getElementById('mobileSettingsBtn').addEventListener('click', () => {
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

        // Audio panel toggle
        document.getElementById('toggleAudioPanel').addEventListener('click', () => {
            this.toggleAudioPanel();
        });

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            const menuPanel = document.getElementById('menuPanel');
            const settingsPanel = document.getElementById('settingsPanel');
            const menuBtn = document.getElementById('menuBtn');
            const settingsBtn = document.getElementById('settingsBtn');
            const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');

            if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
                this.closePanel('menuPanel');
            }

            if (!settingsPanel.contains(e.target) && 
                !settingsBtn.contains(e.target) && 
                !mobileSettingsBtn.contains(e.target)) {
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

        // Add Book modal event listeners
        document.getElementById('addBookBtn').addEventListener('click', () => {
            this.openAddBookModal();
        });

        document.getElementById('addBookModalClose').addEventListener('click', () => {
            this.closeAddBookModal();
        });

        document.getElementById('addBookModalOverlay').addEventListener('click', () => {
            this.closeAddBookModal();
        });

        document.getElementById('addBookCancelBtn').addEventListener('click', () => {
            this.closeAddBookModal();
        });

        document.getElementById('addBookSaveBtn').addEventListener('click', () => {
            this.addBookFromJson();
        });

        // File input event listener
        document.getElementById('bookJsonFile').addEventListener('change', (e) => {
            this.handleFileSelection(e);
        });

        // Aristo floating button event listener
        document.getElementById('aristoFloatingBtn').addEventListener('click', () => {
            this.handleAristoButtonClick();
        });

        document.getElementById('aristoFloatingBtn').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleAristoButtonClick();
            }
        });

        // Aristo modal event listeners
        document.getElementById('aristoModalClose').addEventListener('click', () => {
            this.closeAristoModal();
        });

        document.getElementById('aristoModalOverlay').addEventListener('click', () => {
            this.closeAristoModal();
        });

        document.getElementById('aristoCancelBtn').addEventListener('click', () => {
            this.closeAristoModal();
        });

        document.getElementById('aristoSubmitBtn').addEventListener('click', () => {
            this.submitAristoQuery();
        });

        document.getElementById('aristoSaveHighlightBtn').addEventListener('click', () => {
            this.saveAristoResponseAsHighlight();
        });

        // Enter key in Aristo textarea
        document.getElementById('aristoTextarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.submitAristoQuery();
            }
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
                this.closeAristoModal();
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
            
            // Dispatch custom event for audiobook reader
            const chapterLoadedEvent = new CustomEvent('chapterLoaded', {
                detail: {
                    chapterId: chapter.id,
                    chapterNumber: chapterNumber,
                    content: chapter.content
                }
            });
            document.dispatchEvent(chapterLoadedEvent);
            
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
            case 'aristo-context':
            case 'context':
                return 'Context from Aristo';
            case 'aristo-analysis':
            case 'analysis':
                return 'Analysis from Aristo';
            default: 
                return `Aristo Note (${type || 'unknown'})`;
        }
    }

    getHighlightCssClass(type) {
        switch(type) {
            case 'context':
                return 'aristo-context';
            case 'analysis':
                return 'aristo-analysis';
            default:
                return 'aristo-context'; // fallback
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
            console.log('Processing highlight with map key:', term, 'and selectedText:', highlight.selectedText);
            
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
                    originalKey: term, // This is the actual map key (lowercase selected text)
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
                const { term, originalKey, type, data } = highlightData[0];
                const title = data.title || 'Highlight';
                const cssClass = this.getHighlightCssClass(type);
                // Use the original key from the map instead of the term
                const replacement = `<span class="highlight ${cssClass}" data-highlight="${originalKey}" data-type="${type}" data-title="${title}">${text}</span>`;
                formattedContent = formattedContent.substring(0, start) + replacement + formattedContent.substring(end);
                console.log('Applied single highlight:', {
                    text: text.substring(0, 50) + '...',
                    type: type,
                    cssClass: cssClass,
                    dataHighlight: originalKey,
                    originalTerm: term,
                    mapKey: originalKey,
                    replacement: replacement.substring(0, 200) + '...'
                });
            } else {
                // Multiple overlapping highlights
                const typeClasses = highlightData.map(h => this.getHighlightCssClass(h.type)).join(' ');
                const originalKeys = highlightData.map(h => h.originalKey).join('|');
                const titles = highlightData.map(h => h.data.title || 'Highlight').join(' | ');
                const replacement = `<span class="highlight highlight-stack ${typeClasses}" data-highlight="${originalKeys}" data-type="multiple" data-title="${titles}">${text}</span>`;
                formattedContent = formattedContent.substring(0, start) + replacement + formattedContent.substring(end);
                console.log('Applied multiple highlights:', {
                    text: text,
                    typeClasses: typeClasses,
                    originalKeys: originalKeys,
                    replacement: replacement
                });
            }
        });
        
        return formattedContent;
    }

    setupHighlightListeners() {
        console.log('=== SETTING UP HIGHLIGHT LISTENERS ===');
        console.log('Current chapter ID:', this.currentChapterId);
        console.log('Highlights in cache:', this.chapterHighlights.get(this.currentChapterId));
        
        // Remove any existing event listeners first
        const textContent = document.getElementById('textContent');
        if (textContent._highlightHandler) {
            textContent.removeEventListener('click', textContent._highlightHandler);
        }
        
        // Use event delegation for better reliability
        const highlightClickHandler = (e) => {
            console.log('Text content clicked, checking for highlight...');
            
            // Find the closest highlight element
            const highlight = e.target.closest('.highlight');
            
            if (!highlight) {
                console.log('Click was not on a highlight');
                return; // Not a highlight click
            }
            
            console.log('🎯 HIGHLIGHT CLICKED VIA DELEGATION!', {
                target: e.target,
                highlight: highlight,
                dataset: highlight.dataset,
                classList: highlight.classList.toString(),
                textContent: highlight.textContent.substring(0, 50)
            });
            
            e.preventDefault();
            e.stopPropagation();
            
            const highlightData = highlight.dataset.highlight;
            const type = highlight.dataset.type;
            
            console.log('Processing highlight click:', {
                highlightData: highlightData,
                type: type
            });
            
            if (!highlightData) {
                console.error('❌ No highlight data found on clicked element');
                return;
            }
            
            try {
                if (type === 'multiple') {
                    console.log('📚 Showing multiple highlights');
                    this.showMultipleHighlights(highlightData.split('|'));
                } else {
                    console.log('📖 Showing single highlight for term:', highlightData?.substring(0, 50) + '...');
                    console.log('Full term length:', highlightData?.length);
                    this.showTextBubble(highlightData);
                }
            } catch (error) {
                console.error('❌ Error showing highlight:', error);
            }
        };
        
        // Store the handler reference for cleanup
        textContent._highlightHandler = highlightClickHandler;
        textContent.addEventListener('click', highlightClickHandler);
        console.log('✅ Event delegation listener added to textContent');
        
        // Also add direct listeners as backup
        const highlights = document.querySelectorAll('.highlight');
        console.log(`Found ${highlights.length} highlights to set up listeners`);
        
        if (highlights.length === 0) {
            console.warn('⚠️ No highlights found! This might be the issue.');
            console.log('HTML content preview:', textContent.innerHTML.substring(0, 500));
        }
        
        highlights.forEach((highlight, index) => {
            console.log(`Setting up direct listener for highlight ${index}:`, {
                text: highlight.textContent.substring(0, 50),
                dataset: highlight.dataset,
                classList: highlight.classList.toString(),
                outerHTML: highlight.outerHTML.substring(0, 200)
            });
            
            // Style the highlight to show it's clickable
            highlight.style.cursor = 'pointer';
            highlight.title = `Click to view: ${highlight.dataset.title || 'Highlight'}`;
            
            // Add a visual test - change background on hover
            highlight.addEventListener('mouseenter', () => {
                console.log('🖱️ Mouse entered highlight:', highlight.textContent.substring(0, 30));
                highlight.style.opacity = '0.8';
            });
            
            highlight.addEventListener('mouseleave', () => {
                highlight.style.opacity = '1';
            });
            
            // Add direct listener as backup
            highlight.addEventListener('click', (e) => {
                console.log('🎯 DIRECT HIGHLIGHT CLICK:', highlight.textContent.substring(0, 30));
                e.preventDefault();
                e.stopPropagation();
                
                const highlightData = highlight.dataset.highlight;
                const type = highlight.dataset.type;
                
                console.log('Direct click - Highlight data:', highlightData, 'Type:', type);
                
                if (!highlightData) {
                    console.error('❌ No highlight data found on direct clicked element');
                    return;
                }
                
                try {
                    if (type === 'multiple') {
                        this.showMultipleHighlights(highlightData.split('|'));
                    } else {
                        this.showTextBubble(highlightData);
                    }
                } catch (error) {
                    console.error('❌ Error in direct click handler:', error);
                }
            });
        });
        
        console.log('=== HIGHLIGHT LISTENERS SETUP COMPLETE ===');
        
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

    // Test function to manually trigger text bubble (for debugging)
    testTextBubble() {
        console.log('🧪 Testing text bubble manually...');
        
        const highlights = this.chapterHighlights.get(this.currentChapterId);
        if (!highlights || highlights.size === 0) {
            console.log('❌ No highlights available for testing');
            return;
        }
        
        // Get the first highlight to test with
        const firstKey = highlights.keys().next().value;
        const firstHighlight = highlights.get(firstKey);
        
        console.log('Testing with highlight:', firstKey, firstHighlight);
        
        this.showTextBubble(firstKey);
    }

    // Test function to check if highlights exist in DOM
    testHighlightsInDOM() {
        console.log('🧪 Testing highlights in DOM...');
        
        const highlights = document.querySelectorAll('.highlight');
        console.log(`Found ${highlights.length} highlight elements in DOM`);
        
        highlights.forEach((highlight, index) => {
            console.log(`Highlight ${index}:`, {
                text: highlight.textContent.substring(0, 50),
                dataset: highlight.dataset,
                classList: highlight.classList.toString(),
                clickable: highlight.style.cursor === 'pointer'
            });
        });
        
        return highlights.length;
    }

    showTextBubble(term) {
        console.log('🔍 showTextBubble called with term:', term.substring(0, 100) + '...');
        console.log('Current chapter ID:', this.currentChapterId);
        
        const highlights = this.chapterHighlights.get(this.currentChapterId);
        console.log('Available highlights map size:', highlights?.size);
        
        if (!highlights) {
            console.error('❌ No highlights found for current chapter');
            return;
        }
        
        // First try exact match
        let highlight = highlights.get(term);
        console.log('Exact match result:', !!highlight);
        
        // If no exact match, try lowercase
        if (!highlight) {
            highlight = highlights.get(term.toLowerCase());
            console.log('Lowercase match result:', !!highlight);
        }
        
        if (!highlight) {
            console.error('❌ Highlight not found for term:', term.substring(0, 50) + '...');
            console.log('Available highlight keys:');
            Array.from(highlights.keys()).forEach((key, index) => {
                console.log(`  ${index}: "${key.substring(0, 50)}..."`);
            });
            
            // Try to find the highlight by partial matching
            let foundHighlight = null;
            for (const [key, highlightData] of highlights) {
                // Check if the term contains the key or vice versa
                if (term.toLowerCase().includes(key) || key.includes(term.toLowerCase())) {
                    console.log('Found partial match with key:', key.substring(0, 50) + '...');
                    foundHighlight = highlightData;
                    break;
                }
            }
            
            if (foundHighlight) {
                console.log('Using found highlight via partial match');
                highlight = foundHighlight;
            } else {
                console.error('❌ No match found even with partial matching');
                return;
            }
        }

        const bubble = document.getElementById('textBubble');
        const overlay = document.getElementById('textBubbleOverlay');
        const title = document.getElementById('textBubbleTitle');
        const type = document.getElementById('textBubbleType');
        const content = document.getElementById('textBubbleContent');

        console.log('Text bubble elements:', {
            bubble: !!bubble,
            overlay: !!overlay,
            title: !!title,
            type: !!type,
            content: !!content
        });

        if (!bubble || !overlay || !title || !type || !content) {
            console.error('❌ Missing text bubble elements in DOM');
            return;
        }

        console.log('Setting bubble content:', {
            title: highlight.title,
            typeName: highlight.typeName,
            content: highlight.content.substring(0, 100) + '...'
        });

        title.textContent = highlight.title;
        type.textContent = highlight.typeName;
        type.className = `text-bubble-type ${this.getHighlightCssClass(highlight.type)}`;
        content.innerHTML = highlight.content;

        overlay.classList.add('show');
        bubble.classList.add('show');

        console.log('✅ Text bubble should now be visible');

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
            case 'context':
            case 'aristo-context': 
                return '#F44336';
            case 'analysis':
            case 'aristo-analysis': 
                return '#2196F3';
            default: 
                return '#666';
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

    toggleAudioPanel() {
        const audiobookPanel = document.getElementById('audiobookPanel');
        const toggleButton = document.getElementById('toggleAudioPanel');
        const toggleText = toggleButton.querySelector('.audio-toggle-text');
        
        if (audiobookPanel) {
            const isHidden = audiobookPanel.style.display === 'none';
            audiobookPanel.style.display = isHidden ? 'block' : 'none';
            toggleText.textContent = isHidden ? 'Hide Audio Controls' : 'Show Audio Controls';
            
            // Save preference
            localStorage.setItem('aristoAudioPanelVisible', isHidden ? 'true' : 'false');
        }
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
            
            // Close menu panel
            this.closePanel('menuPanel');
            
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

    // Add Book Modal Methods
    openAddBookModal() {
        const modal = document.getElementById('addBookModal');
        const overlay = document.getElementById('addBookModalOverlay');
        const fileInput = document.getElementById('bookJsonFile');
        const selectedFileName = document.getElementById('selectedFileName');
        
        // Clear previous file selection
        fileInput.value = '';
        selectedFileName.classList.remove('show');
        selectedFileName.textContent = '';
        
        // Show modal
        overlay.classList.add('show');
        modal.classList.add('show');
    }

    closeAddBookModal() {
        const modal = document.getElementById('addBookModal');
        const overlay = document.getElementById('addBookModalOverlay');
        
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }

    handleFileSelection(event) {
        const file = event.target.files[0];
        const selectedFileName = document.getElementById('selectedFileName');
        
        if (file) {
            if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
                selectedFileName.textContent = `Selected: ${file.name}`;
                selectedFileName.classList.add('show');
            } else {
                alert('Please select a valid JSON file');
                event.target.value = '';
                selectedFileName.classList.remove('show');
                selectedFileName.textContent = '';
            }
        } else {
            selectedFileName.classList.remove('show');
            selectedFileName.textContent = '';
        }
    }

    async addBookFromJson() {
        const fileInput = document.getElementById('bookJsonFile');
        const saveBtn = document.getElementById('addBookSaveBtn');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a JSON file');
            return;
        }

        const file = fileInput.files[0];
        
        // Disable button and show loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding Book...';

        try {
            // Read the file content
            const fileContent = await this.readFileAsText(file);
            
            // Add the book using the file content
            const result = await DatabaseService.addBook(fileContent);
            
            if (result.success) {
                // Success! Close modal and refresh book list
                this.closeAddBookModal();
                
                // Refresh the available books list
                await this.loadAvailableBooks();
                
                // Show success message
                alert(result.message);
                
                // Optionally switch to the newly added book
                if (result.book && result.book.id) {
                    await this.switchBook(result.book.id);
                }
                
            } else {
                // Show error message
                alert('Error adding book: ' + result.message);
            }
            
        } catch (error) {
            console.error('Error adding book:', error);
            alert('Error adding book: ' + error.message);
        } finally {
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.textContent = 'Add Book';
        }
    }

    // Helper method to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Aristo floating button handler
    handleAristoButtonClick() {
        console.log('Aristo floating button clicked!');
        
        // Add visual feedback
        const btn = document.getElementById('aristoFloatingBtn');
        btn.style.transform = 'translateY(-2px) scale(1.1)';
        btn.style.boxShadow = '0 8px 32px rgba(0, 102, 204, 0.6)';
        
        // Reset visual feedback
        setTimeout(() => {
            btn.style.transform = '';
            btn.style.boxShadow = '';
        }, 200);
        
        // Open the Aristo AI modal
        this.openAristoModal();
    }

    openAristoModal() {
        const modal = document.getElementById('aristoModal');
        const overlay = document.getElementById('aristoModalOverlay');
        const textarea = document.getElementById('aristoTextarea');
        const responseDiv = document.getElementById('aristoResponse');
        const responseContent = document.getElementById('aristoResponseContent');
        const saveHighlightBtn = document.getElementById('aristoSaveHighlightBtn');
        
        // Clear previous content
        textarea.value = '';
        responseDiv.style.display = 'none';
        saveHighlightBtn.style.display = 'none';
        
        // Clear stored label
        responseContent.dataset.aristoLabel = '';
        
        // Show modal
        overlay.classList.add('show');
        modal.classList.add('show');
        
        // Focus on textarea
        setTimeout(() => {
            textarea.focus();
        }, 300);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    closeAristoModal() {
        const modal = document.getElementById('aristoModal');
        const overlay = document.getElementById('aristoModalOverlay');
        
        modal.classList.remove('show');
        overlay.classList.remove('show');
        
        // Re-enable body scrolling
        document.body.style.overflow = 'auto';
    }

    async submitAristoQuery() {
        const textarea = document.getElementById('aristoTextarea');
        const submitBtn = document.getElementById('aristoSubmitBtn');
        const responseDiv = document.getElementById('aristoResponse');
        const responseContent = document.getElementById('aristoResponseContent');
        const saveHighlightBtn = document.getElementById('aristoSaveHighlightBtn');
        const userInput = textarea.value.trim();
        
        if (!userInput) {
            alert('Please enter a question or text to analyze.');
            return;
        }
        
        // Disable submit button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Thinking...';
        
        // Hide previous response and save button
        responseDiv.style.display = 'none';
        saveHighlightBtn.style.display = 'none';
        
        try {
            // Get current chapter content for context
            let chapterContext = null;
            if (this.currentChapterId && this.book) {
                const currentChapter = this.book.chapters.find(ch => ch.id === this.currentChapterId);
                if (currentChapter) {
                    chapterContext = {
                        title: currentChapter.title,
                        content: currentChapter.content,
                        chapterNumber: this.currentChapterNumber
                    };
                }
            }

            // Call the Flask API
            const response = await fetch('/api/aristo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: userInput,
                    chapterContext: chapterContext
                })
            });
            
            const data = await response.json();
            
            console.log('=== ARISTO RESPONSE DEBUG ===');
            console.log('Full response data:', data);
            console.log('Response label:', data.label);
            console.log('Label type:', typeof data.label);
            console.log('Is label valid?', ['context', 'analysis'].includes(data.label));
            
            if (data.success) {
                // Show the response
                responseContent.textContent = data.response;
                responseDiv.style.display = 'block';
                
                // Store the label for later use when saving highlights
                const labelToStore = data.label || 'analysis';
                responseContent.dataset.aristoLabel = labelToStore;
                
                console.log('Stored label in dataset:', labelToStore);
                console.log('Dataset after storing:', responseContent.dataset.aristoLabel);
                
                // Show Save Highlight button
                saveHighlightBtn.style.display = 'inline-block';
                
                // Show a subtle indication if it's a fallback response
                if (data.fallback) {
                    responseContent.style.borderLeft = '3px solid orange';
                    responseContent.title = 'Fallback response - OpenAI API may not be configured';
                } else {
                    // Set border color based on label
                    const label = data.label || 'analysis';
                    if (label === 'context') {
                        responseContent.style.borderLeft = '3px solid rgba(244, 67, 54, 0.8)'; // Red for context
                    } else {
                        responseContent.style.borderLeft = '3px solid rgba(33, 150, 243, 0.8)'; // Blue for analysis
                    }
                    responseContent.title = `AI-powered ${label} from Aristo`;
                }
                
                // Scroll response into view
                responseDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Error calling Aristo API:', error);
            
            // Show error message
            responseContent.textContent = `Sorry, I encountered an error while processing your request: ${error.message}`;
            responseContent.style.borderLeft = '3px solid red';
            responseDiv.style.display = 'block';
            // Don't show save button for error responses
            
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ask Aristo';
        }
    }

    async saveAristoResponseAsHighlight() {
        const textarea = document.getElementById('aristoTextarea');
        const responseContent = document.getElementById('aristoResponseContent');
        const saveHighlightBtn = document.getElementById('aristoSaveHighlightBtn');
        
        const userQuestion = textarea.value.trim();
        const aristoResponse = responseContent.textContent;
        
        console.log('=== SAVE HIGHLIGHT DEBUG START ===');
        console.log('User question:', userQuestion);
        console.log('Aristo response:', aristoResponse?.substring(0, 100) + '...');
        console.log('Current book ID:', this.currentBookId);
        console.log('Current chapter ID:', this.currentChapterId);
        
        // Check if we have the response element and it has been properly initialized
        if (!responseContent) {
            console.error('❌ Response content element not found');
            alert('Error: Could not find response content. Please try asking Aristo again.');
            return;
        }
        
        // Wait a moment for any pending DOM updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!userQuestion || !aristoResponse) {
            console.error('Missing question or response');
            alert('No content to save as highlight.');
            return;
        }
        
        try {
            saveHighlightBtn.disabled = true;
            saveHighlightBtn.textContent = 'Finding relevant text...';
            
            // Get current chapter content
            let chapterContent = '';
            if (this.currentChapterId && this.book) {
                const currentChapter = this.book.chapters.find(ch => ch.id === this.currentChapterId);
                if (currentChapter) {
                    chapterContent = currentChapter.content;
                    console.log('Chapter content length:', chapterContent.length);
                } else {
                    console.error('Current chapter not found in book');
                }
            } else {
                console.error('Missing chapter ID or book object');
            }
            
            if (!chapterContent) {
                console.error('No chapter content available');
                alert('Unable to access chapter content for text selection.');
                return;
            }
            
            console.log('Calling AI text selection...');
            // Use AI to find the most relevant text snippet
            const selectedText = await this.findRelevantTextWithAI(userQuestion, aristoResponse, chapterContent);
            console.log('AI selected text:', selectedText?.substring(0, 100) + '...');
            
            if (!selectedText) {
                console.error('AI failed to select relevant text');
                alert('Could not find relevant text in the chapter to highlight. Please try asking a more specific question about the chapter content.');
                return;
            }
            
            saveHighlightBtn.textContent = 'Saving highlight...';
            
            // Get highlight data from stored Aristo response
            const responseContentElement = document.getElementById('aristoResponseContent');
            console.log('=== HIGHLIGHT DATA EXTRACTION ===');
            console.log('Response content element:', responseContentElement);
            console.log('Dataset object:', responseContentElement.dataset);
            console.log('All dataset keys:', Object.keys(responseContentElement.dataset));
            
            // Extract the label (highlight_type) from the stored dataset
            const aristoLabel = responseContentElement.dataset.aristoLabel || 'analysis';
            console.log('Retrieved aristo label:', aristoLabel);
            
            // Ensure we have a valid highlight_type value
            let highlightType;
            if (aristoLabel === 'context') {
                highlightType = 'context';
            } else {
                highlightType = 'analysis'; // Default fallback
            }
            
            // Get the Aristo response content (this will be the 'content' field)
            const aristoContent = aristoResponse;
            
            console.log('🎯 HIGHLIGHT DATA MAPPING:');
            console.log('- title: "Aristo Note" (static)');
            console.log('- content: Aristo response (' + aristoContent.length + ' chars)');
            console.log('- highlight_type:', highlightType);
            console.log('- selected_text: Will be AI-selected from chapter');
            console.log('- book_id: Need UUID from books table');
            console.log('- chapter_id: Need UUID from chapters table');
            console.log('=== END HIGHLIGHT DATA EXTRACTION ===');
            
            // Calculate position of selected text in the chapter
            const textContent = document.getElementById('textContent');
            const plainTextContent = textContent.textContent || textContent.innerText;
            const positionStart = plainTextContent.indexOf(selectedText);
            
            console.log('Plain text content length:', plainTextContent.length);
            console.log('Position start:', positionStart);
            
            if (positionStart === -1) {
                console.error('Selected text not found in chapter content');
                console.log('Looking for text:', selectedText.substring(0, 50));
                console.log('In content starting with:', plainTextContent.substring(0, 200));
                alert('Selected text could not be located in the chapter. This may be due to formatting differences.');
                return;
            }
            
            const positionEnd = positionStart + selectedText.length;
            console.log('Position end:', positionEnd);
            
            // Create highlight object with complete field mapping
            console.log('🎯 CREATING HIGHLIGHT OBJECT WITH COMPLETE MAPPING:');
            
            const highlightData = {
                // Static fields
                title: 'Aristo Note',
                content: aristoContent,
                highlight_type: highlightType,
                selected_text: selectedText,
                
                // ID fields - will be resolved to UUIDs by DatabaseService
                book_id: this.currentBookId,
                chapter_id: this.currentChapterId
            };
            
            console.log('🎯 COMPLETE HIGHLIGHT DATA MAPPING:');
            console.log('- title:', highlightData.title);
            console.log('- content length:', highlightData.content.length);
            console.log('- highlight_type:', highlightData.highlight_type);
            console.log('- selected_text length:', highlightData.selected_text.length);
            console.log('- book_id (current):', highlightData.book_id, '(type:', typeof highlightData.book_id, ')');
            console.log('- chapter_id (current):', highlightData.chapter_id, '(type:', typeof highlightData.chapter_id, ')');
            
            // Check if IDs are in UUID format
            const bookIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.currentBookId);
            const chapterIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.currentChapterId);
            console.log('- Book ID is UUID format:', bookIdIsUuid);
            console.log('- Chapter ID is UUID format:', chapterIdIsUuid);
            
            // Check if we're using real database or mock data
            const isRealDb = await DatabaseService.isUsingRealDatabase();
            console.log('- Using real database:', isRealDb);
            
            // Validate all required fields
            const requiredFields = ['title', 'content', 'book_id', 'chapter_id', 'selected_text', 'highlight_type'];
            const missingFields = requiredFields.filter(field => !highlightData[field]);
            
            console.log('=== FIELD VALIDATION ===');
            console.log('Required fields:', requiredFields);
            console.log('Missing fields:', missingFields);
            
            requiredFields.forEach(field => {
                const value = highlightData[field];
                console.log(`Field ${field}: "${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}" (type: ${typeof value})`);
            });
            
            if (missingFields.length > 0) {
                console.error('❌ Missing required fields for highlight:', missingFields);
                alert(`Cannot save highlight: missing required data (${missingFields.join(', ')})`);
                return;
            }
            
            // Validate highlight_type specifically
            const validHighlightTypes = ['context', 'analysis'];
            if (!validHighlightTypes.includes(highlightData.highlight_type)) {
                console.error('❌ Invalid highlight_type:', highlightData.highlight_type);
                highlightData.highlight_type = 'analysis'; // Fallback
                console.log('✅ Corrected highlight_type to:', highlightData.highlight_type);
            }
            
            console.log('🎯 FINAL HIGHLIGHT DATA FOR DATABASE:');
            console.log('- Sending to: highlights table');
            console.log('- Total fields:', Object.keys(highlightData).length);
            console.log('- Complete object:', highlightData);
            console.log('- Field breakdown:');
            Object.entries(highlightData).forEach(([key, value]) => {
                const preview = String(value).length > 100 ? String(value).substring(0, 100) + '...' : String(value);
                console.log(`    ${key}: "${preview}" (${typeof value}, ${String(value).length} chars)`);
            });
            
            console.log('Calling DatabaseService.createHighlight...');
            const savedHighlight = await DatabaseService.createHighlight(highlightData);
            console.log('Saved highlight result:', savedHighlight);
            
            // Add to local cache
            if (!this.chapterHighlights.has(this.currentChapterId)) {
                this.chapterHighlights.set(this.currentChapterId, new Map());
            }
            
            const highlightMap = this.chapterHighlights.get(this.currentChapterId);
            const highlightKey = savedHighlight.selected_text.toLowerCase();
            
            highlightMap.set(highlightKey, {
                id: savedHighlight.id,
                type: savedHighlight.highlight_type,
                typeName: this.getTypeDisplayName(savedHighlight.highlight_type),
                title: savedHighlight.title,
                content: savedHighlight.content,
                selectedText: savedHighlight.selected_text
            });
            
            console.log('Added to local cache with key:', highlightKey);
            console.log('Cache now has', highlightMap.size, 'highlights for this chapter');
            
            // Show success message and close modal
            const successMessage = `Aristo response saved as highlight!\n\nHighlighted text: "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"\n\nThe highlight will appear when you refresh or navigate back to this chapter.`;
            console.log('Showing success message');
            alert(successMessage);
            this.closeAristoModal();
            
            // Refresh highlights display
            console.log('Refreshing highlights display...');
            await this.loadChapterHighlights(this.currentChapterId);
            console.log('=== SAVE HIGHLIGHT DEBUG SUCCESS ===');
            
        } catch (error) {
            console.error('=== SAVE HIGHLIGHT DEBUG ERROR ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            let errorMessage = 'Failed to save highlight. ';
            if (error.message) {
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    errorMessage += 'Database table not found. Please check your database setup.';
                } else if (error.message.includes('permission denied')) {
                    errorMessage += 'Permission denied. Please check your database permissions.';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage += 'Network error. Please check your connection.';
                } else {
                    errorMessage += `Details: ${error.message}`;
                }
            } else {
                errorMessage += 'Please check the console for more details.';
            }
            
            alert(errorMessage);
        } finally {
            saveHighlightBtn.disabled = false;
            saveHighlightBtn.textContent = 'Save Highlight';
            console.log('=== SAVE HIGHLIGHT DEBUG END ===');
        }
    }

    async findRelevantTextWithAI(userQuestion, aristoResponse, chapterContent) {
        console.log('=== AI TEXT SELECTION DEBUG START ===');
        console.log('Question length:', userQuestion.length);
        console.log('Response length:', aristoResponse.length);
        console.log('Chapter content length:', chapterContent.length);
        
        try {
            console.log('Making API call to /api/find-relevant-text...');
            const response = await fetch('/api/find-relevant-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userQuestion,
                    aristoResponse,
                    chapterContent
                })
            });
            
            console.log('API response status:', response.status);
            console.log('API response ok:', response.ok);
            
            if (!response.ok) {
                console.error('API response not ok:', response.status, response.statusText);
                return null;
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            
            if (data.success && data.selectedText) {
                console.log('AI text selection successful');
                console.log('Selected text length:', data.selectedText.length);
                console.log('=== AI TEXT SELECTION DEBUG SUCCESS ===');
                return data.selectedText;
            } else {
                console.error('AI text selection failed:', data.error);
                console.log('=== AI TEXT SELECTION DEBUG FAILED ===');
                return null;
            }
            
        } catch (error) {
            console.error('=== AI TEXT SELECTION DEBUG ERROR ===');
            console.error('Error calling AI text selection API:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return null;
        }
    }

    showAristoMenu() {
        // This method is no longer needed since we're opening the modal directly
        // Keeping it for backwards compatibility
        this.openAristoModal();
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Supabase to be ready before initializing BookReader
        if (typeof ensureSupabaseReady === 'function') {
            console.log('Waiting for Supabase initialization...');
            await ensureSupabaseReady();
            console.log('✅ Supabase initialization complete');
        }
        
        // Create and initialize BookReader
        window.bookReader = new BookReader();
        await window.bookReader.init();
        console.log('✅ BookReader initialized and available as window.bookReader');
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        // Still create BookReader but it will use mock data
        window.bookReader = new BookReader();
        await window.bookReader.init();
        console.log('⚠️ BookReader initialized with fallback data');
    }
});
