// Debug script to test highlight styling
// Run this in the browser console to check if highlights are working

console.log('=== HIGHLIGHT STYLING DEBUG ===');

// Check if the reader app is available
const app = window.bookReader || window.reader || window.currentReaderApp;
if (!app) {
    console.error('Reader app not found. Try: window.bookReader = new BookReader(); then run this script again.');
} else {
    console.log('✓ Reader app found');
    
    // Check current chapter
    console.log('Current chapter ID:', app.currentChapterId);
    
    // Check if highlights are loaded
    const highlights = app.chapterHighlights.get(app.currentChapterId);
    console.log('Highlights in cache:', highlights ? highlights.size : 0);
    
    if (highlights && highlights.size > 0) {
        console.log('✓ Highlights found in cache');
        highlights.forEach((highlight, term) => {
            console.log(`  - "${term}": type="${highlight.type}", cssClass="${app.getHighlightCssClass(highlight.type)}"`);
        });
        
        // Check DOM elements
        const highlightElements = document.querySelectorAll('.highlight');
        console.log('Highlight elements in DOM:', highlightElements.length);
        
        if (highlightElements.length > 0) {
            console.log('✓ Found highlight elements in DOM');
            highlightElements.forEach((elem, i) => {
                const computedStyle = window.getComputedStyle(elem);
                console.log(`  Highlight ${i + 1}:`, {
                    text: elem.textContent.substring(0, 30) + '...',
                    classes: elem.className,
                    backgroundColor: computedStyle.backgroundColor,
                    borderBottom: computedStyle.borderBottom,
                    visible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
                });
            });
        } else {
            console.error('❌ No highlight elements found in DOM');
            console.log('This suggests the formatChapterContent function is not applying highlights correctly');
        }
        
        // Test CSS class mapping
        console.log('CSS class mapping test:');
        console.log('  context → ' + app.getHighlightCssClass('context'));
        console.log('  analysis → ' + app.getHighlightCssClass('analysis'));
        
        // Check if CSS classes exist
        const testElement = document.createElement('span');
        testElement.className = 'highlight aristo-context';
        document.body.appendChild(testElement);
        const contextStyle = window.getComputedStyle(testElement);
        console.log('Context highlight style test:');
        console.log('  backgroundColor:', contextStyle.backgroundColor);
        console.log('  borderBottom:', contextStyle.borderBottom);
        testElement.remove();
        
        testElement.className = 'highlight aristo-analysis';
        document.body.appendChild(testElement);
        const analysisStyle = window.getComputedStyle(testElement);
        console.log('Analysis highlight style test:');
        console.log('  backgroundColor:', analysisStyle.backgroundColor);
        console.log('  borderBottom:', analysisStyle.borderBottom);
        testElement.remove();
        
    } else {
        console.log('❌ No highlights found in cache');
        console.log('Try creating a highlight first by asking Aristo a question and saving the response');
    }
}

console.log('=== END DEBUG ===');
