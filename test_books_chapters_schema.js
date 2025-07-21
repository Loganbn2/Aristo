// Test script to check books and chapters table schema and data
// Copy and paste this into the browser console while the app is running

async function testBooksAndChaptersSchema() {
    console.log('=== TESTING BOOKS AND CHAPTERS TABLE SCHEMA ===');
    
    try {
        // Get books with their actual structure
        console.log('Testing books table...');
        const { data: books, error: booksError } = await supabaseClient
            .from('books')
            .select('*')
            .limit(3);
            
        if (booksError) {
            console.log('Error querying books:', booksError);
        } else {
            console.log('Sample books from database:');
            console.log('- Total found:', books.length);
            books.forEach((book, index) => {
                console.log(`- Book ${index + 1}:`);
                console.log(`  - id: ${book.id} (type: ${typeof book.id})`);
                console.log(`  - title: ${book.title}`);
                
                // Check if ID is UUID format
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id);
                console.log(`  - is UUID format: ${isUuid}`);
            });
        }
        
        // Get chapters with their actual structure  
        console.log('Testing chapters table...');
        const { data: chapters, error: chaptersError } = await supabaseClient
            .from('chapters')
            .select('*')
            .limit(5);
            
        if (chaptersError) {
            console.log('Error querying chapters:', chaptersError);
        } else {
            console.log('Sample chapters from database:');
            console.log('- Total found:', chapters.length);
            chapters.forEach((chapter, index) => {
                console.log(`- Chapter ${index + 1}:`);
                console.log(`  - id: ${chapter.id} (type: ${typeof chapter.id})`);
                console.log(`  - book_id: ${chapter.book_id} (type: ${typeof chapter.book_id})`);
                console.log(`  - chapter_number: ${chapter.chapter_number}`);
                console.log(`  - title: ${chapter.title}`);
                
                // Check if IDs are UUID format
                const idIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.id);
                const bookIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.book_id);
                console.log(`  - id is UUID format: ${idIsUuid}`);
                console.log(`  - book_id is UUID format: ${bookIdIsUuid}`);
            });
        }
        
    } catch (error) {
        console.error('Error testing books and chapters tables:', error);
    }
}

// Run the test
testBooksAndChaptersSchema();
