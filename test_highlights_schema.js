// Test script to check highlights table schema
// Copy and paste this into the browser console while the app is running

async function testHighlightsTableSchema() {
    console.log('=== TESTING HIGHLIGHTS TABLE SCHEMA ===');
    
    try {
        // Try to get any existing highlights to see the structure
        const { data: highlights, error } = await supabaseClient
            .from('highlights')
            .select('*')
            .limit(5);
            
        if (error) {
            console.log('Error querying highlights:', error);
        } else {
            console.log('Sample highlights from database:');
            console.log('- Total found:', highlights.length);
            if (highlights.length > 0) {
                console.log('- First highlight:', highlights[0]);
                console.log('- Fields in highlights table:', Object.keys(highlights[0]));
                
                // Check ID types
                highlights.forEach((highlight, index) => {
                    console.log(`- Highlight ${index + 1}:`);
                    console.log(`  - id: ${highlight.id} (type: ${typeof highlight.id})`);
                    console.log(`  - book_id: ${highlight.book_id} (type: ${typeof highlight.book_id})`);
                    console.log(`  - chapter_id: ${highlight.chapter_id} (type: ${typeof highlight.chapter_id})`);
                });
            } else {
                console.log('No highlights found in database');
            }
        }
        
        // Try to describe the table structure (this might not work depending on RLS settings)
        console.log('Attempting to describe table structure...');
        const { data: tableInfo, error: tableError } = await supabaseClient
            .rpc('get_table_info', { table_name: 'highlights' });
            
        if (tableError) {
            console.log('Could not get table info:', tableError);
        } else {
            console.log('Table structure:', tableInfo);
        }
        
    } catch (error) {
        console.error('Error testing highlights table:', error);
    }
}

// Run the test
testHighlightsTableSchema();
