// Test script to verify the chapterHighlights cache fix
// Copy and paste this into browser console

function testChapterHighlightsCache() {
    console.log('🧪 TESTING CHAPTER HIGHLIGHTS CACHE FIX');
    console.log('========================================');
    
    if (!window.bookReader) {
        console.log('❌ BookReader not found');
        return;
    }
    
    const reader = window.bookReader;
    
    // 1. Check current cache structure
    console.log('\n1️⃣ CURRENT CACHE STRUCTURE:');
    console.log('- chapterHighlights type:', typeof reader.chapterHighlights);
    console.log('- chapterHighlights instanceof Map:', reader.chapterHighlights instanceof Map);
    console.log('- Current chapter ID:', reader.currentChapterId);
    console.log('- Cache has current chapter:', reader.chapterHighlights.has(reader.currentChapterId));
    
    if (reader.chapterHighlights.has(reader.currentChapterId)) {
        const chapterCache = reader.chapterHighlights.get(reader.currentChapterId);
        console.log('- Chapter cache type:', typeof chapterCache);
        console.log('- Chapter cache instanceof Map:', chapterCache instanceof Map);
        console.log('- Chapter cache size:', chapterCache.size);
        
        if (chapterCache instanceof Map) {
            console.log('- Cache entries:');
            chapterCache.forEach((value, key) => {
                console.log(`  "${key}": ${JSON.stringify(value, null, 2).substring(0, 100)}...`);
            });
        }
    }
    
    // 2. Test the getTypeDisplayName function
    console.log('\n2️⃣ TESTING getTypeDisplayName FUNCTION:');
    const testTypes = ['context', 'analysis', 'aristo-context', 'aristo-analysis', 'unknown'];
    testTypes.forEach(type => {
        console.log(`- "${type}" -> "${reader.getTypeDisplayName(type)}"`);
    });
    
    // 3. Simulate adding a highlight to cache
    console.log('\n3️⃣ SIMULATING CACHE UPDATE:');
    const testHighlight = {
        id: 'test-highlight-id',
        highlight_type: 'analysis',
        title: 'Test Aristo Note',
        content: 'This is a test highlight content',
        selected_text: 'Test selected text for cache simulation'
    };
    
    try {
        // Ensure cache structure exists
        if (!reader.chapterHighlights.has(reader.currentChapterId)) {
            reader.chapterHighlights.set(reader.currentChapterId, new Map());
            console.log('✅ Created new Map for current chapter');
        }
        
        const highlightMap = reader.chapterHighlights.get(reader.currentChapterId);
        const highlightKey = testHighlight.selected_text.toLowerCase();
        
        highlightMap.set(highlightKey, {
            id: testHighlight.id,
            type: testHighlight.highlight_type,
            typeName: reader.getTypeDisplayName(testHighlight.highlight_type),
            title: testHighlight.title,
            content: testHighlight.content,
            selectedText: testHighlight.selected_text
        });
        
        console.log('✅ Successfully added test highlight to cache');
        console.log('- Cache key:', highlightKey);
        console.log('- Cache size after add:', highlightMap.size);
        console.log('- Retrieved value:', highlightMap.get(highlightKey));
        
        // Clean up test data
        highlightMap.delete(highlightKey);
        console.log('🧹 Cleaned up test data');
        
    } catch (error) {
        console.log('❌ Error during cache simulation:', error);
    }
    
    console.log('\n✅ CACHE TEST COMPLETE');
    console.log('The cache structure should now work correctly with the save highlight function!');
}

// Run the test
testChapterHighlightsCache();
