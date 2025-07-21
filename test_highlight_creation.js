// Test script to run in browser console to test highlight creation
// This script tests the database highlight creation directly

console.log('=== HIGHLIGHT CREATION TEST START ===');

async function testHighlightCreation() {
    try {
        console.log('1. Testing database connection...');
        
        // Test with minimal data
        const testHighlight = {
            book_id: '2b154c7a-5485-483e-982e-8425ec7d67d6',
            chapter_id: '1',
            selected_text: 'Test highlight for debugging schema issues',
            highlight_type: 'test'
        };
        
        console.log('2. Attempting to create highlight with data:', testHighlight);
        
        const result = await DatabaseService.createHighlight(testHighlight);
        
        console.log('3. ✅ Highlight creation succeeded:', result);
        
        // Clean up if possible
        if (result.id && DatabaseService.deleteHighlight) {
            console.log('4. Cleaning up test highlight...');
            await DatabaseService.deleteHighlight(result.id);
            console.log('4. ✅ Test highlight cleaned up');
        }
        
        console.log('=== TEST COMPLETED SUCCESSFULLY ===');
        
    } catch (error) {
        console.error('=== TEST FAILED ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Try to extract more specific information about the error
        if (error.message && error.message.includes('position_end')) {
            console.error('❌ SCHEMA ERROR: The error is related to position_end column');
            console.error('This suggests that Supabase is expecting this column in the highlights table');
            console.error('Possible solutions:');
            console.error('1. Add position_end column to the database');
            console.error('2. Remove any references to position_end in the codebase');
            console.error('3. Check if there are cached highlight objects with this field');
        }
    }
}

// Run the test
testHighlightCreation();
