// Test script to verify highlight rendering after fixing CSS classes
// Paste this into the browser console after loading a chapter

console.log('Testing highlight rendering...');

// Check if highlights are loaded in cache
const app = window.currentReaderApp || window.reader || window.readerApp;
if (!app) {
    console.error('Reader app not found');
} else {
    console.log('Current chapter ID:', app.currentChapterId);
    const highlights = app.chapterHighlights.get(app.currentChapterId);
    console.log('Loaded highlights for current chapter:', highlights);
    
    if (highlights && highlights.size > 0) {
        console.log('Found', highlights.size, 'highlights:');
        highlights.forEach((highlight, term) => {
            console.log(`- "${term}": type=${highlight.type}, cssClass=${app.getHighlightCssClass(highlight.type)}`);
        });
        
        // Check if highlights are actually rendered in DOM
        const highlightElements = document.querySelectorAll('.highlight');
        console.log('Found', highlightElements.length, 'highlight elements in DOM');
        
        highlightElements.forEach((elem, index) => {
            console.log(`Highlight ${index + 1}:`, {
                text: elem.textContent.substring(0, 50),
                classes: elem.className,
                dataType: elem.dataset.type,
                dataTitle: elem.dataset.title
            });
        });
        
        // Test the CSS class mapping function
        console.log('CSS class mapping test:');
        console.log('context ->', app.getHighlightCssClass('context'));
        console.log('analysis ->', app.getHighlightCssClass('analysis'));
        
    } else {
        console.log('No highlights found for current chapter');
    }
}
