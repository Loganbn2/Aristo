// Manual test for highlight workflow
// Run this in the browser console to force refresh highlights and check styling

console.log('=== MANUAL HIGHLIGHT REFRESH TEST ===');

// Get the reader app
const app = window.bookReader || window.reader;
if (!app) {
    console.error('Reader app not found');
} else {
    console.log('Step 1: Current state');
    console.log('  Chapter ID:', app.currentChapterId);
    console.log('  Cached highlights:', app.chapterHighlights.get(app.currentChapterId)?.size || 0);
    
    // Force reload highlights and refresh display
    app.loadChapterHighlights(app.currentChapterId).then(() => {
        console.log('Step 2: After loading highlights');
        const highlights = app.chapterHighlights.get(app.currentChapterId);
        console.log('  Cached highlights:', highlights?.size || 0);
        
        if (highlights && highlights.size > 0) {
            console.log('Step 3: Updating content with highlights');
            
            // Get current chapter content
            const currentChapter = app.book.chapters.find(ch => ch.id === app.currentChapterId);
            if (currentChapter) {
                // Re-format content with highlights
                const contentDiv = document.getElementById('textContent');
                const formattedContent = app.formatChapterContent(currentChapter.content);
                console.log('  Formatted content length:', formattedContent.length);
                console.log('  Contains highlight spans:', formattedContent.includes('<span class="highlight'));
                
                // Update DOM
                contentDiv.innerHTML = formattedContent;
                
                // Re-setup listeners
                app.setupHighlightListeners();
                
                console.log('Step 4: Checking results');
                const highlightElements = document.querySelectorAll('.highlight');
                console.log('  Highlight elements found:', highlightElements.length);
                
                highlightElements.forEach((elem, i) => {
                    console.log(`  Highlight ${i + 1}:`, {
                        text: elem.textContent.substring(0, 20) + '...',
                        classes: elem.className,
                        clickable: typeof elem.onclick === 'function' || elem.getAttribute('data-highlight') !== null
                    });
                });
                
                console.log('✓ Highlight refresh complete!');
            } else {
                console.error('Current chapter not found');
            }
        } else {
            console.log('No highlights to display');
        }
    }).catch(error => {
        console.error('Error loading highlights:', error);
    });
}

console.log('=== TEST INITIATED ===');
