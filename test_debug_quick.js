
// Quick test to check audio caching for notes
console.log('🔍 Testing note audio caching behavior');

// Simulate the debug scenario
(async function testNoteAudio() {
    try {
        console.log('Testing note audio generation and caching...');
        
        // Check if DatabaseService is available
        if (typeof DatabaseService === 'undefined') {
            console.error('❌ DatabaseService not found!');
            return;
        }
        
        // Test a sample note ID and content
        const testNoteId = 'test-note-123';
        const testContent = 'This is a test note for audio caching';
        
        console.log('📝 Test note:', testNoteId, testContent);
        
        // Check if we can query for existing audio
        console.log('🔍 Checking for existing audio...');
        const existingAudio = await DatabaseService.getNoteAudio(testNoteId, 'alloy', 'tts-1');
        console.log('🔍 Existing audio result:', existingAudio);
        
        if (existingAudio) {
            console.log('✅ Found existing audio, should not regenerate');
        } else {
            console.log('📭 No existing audio found, would generate new');
        }
        
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
})();
    