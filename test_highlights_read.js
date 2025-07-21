// Browser console test to check if we can read from highlights table
console.log('=== TESTING HIGHLIGHTS TABLE READ ===');

async function testHighlightsRead() {
    try {
        console.log('Testing if we can read from highlights table...');
        
        const highlights = await DatabaseService.getHighlights('2b154c7a-5485-483e-982e-8425ec7d67d6');
        
        console.log('✅ Successfully read highlights:', highlights);
        console.log('Number of highlights:', highlights.length);
        
        if (highlights.length > 0) {
            console.log('Sample highlight structure:', highlights[0]);
            console.log('Sample highlight keys:', Object.keys(highlights[0]));
            
            // Check if any existing highlights have position_end field
            const hasPositionEnd = highlights.some(h => h.hasOwnProperty('position_end'));
            if (hasPositionEnd) {
                console.warn('⚠️ Found existing highlights with position_end field!');
                console.warn('This might be causing the schema cache issue');
            } else {
                console.log('✅ No position_end fields found in existing highlights');
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to read highlights:', error);
        console.error('Error message:', error.message);
    }
}

testHighlightsRead();
