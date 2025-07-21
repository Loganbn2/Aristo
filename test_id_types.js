// Test script to check ID types in the browser console
// Copy and paste this into the browser console while the app is running

async function testIdTypes() {
    console.log('=== TESTING ID TYPES ===');
    
    try {
        // Check if we're using Supabase or mock data
        console.log('Database configuration check:');
        console.log('- Supabase URL:', window.SUPABASE_URL);
        console.log('- Has Supabase client:', window.supabaseClient !== null);
        
        // Get books and check ID types
        const books = await DatabaseService.getBooks();
        console.log('Books data:');
        console.log('- Total books:', books.length);
        if (books.length > 0) {
            console.log('- First book ID:', books[0].id, '(type:', typeof books[0].id, ')');
            console.log('- First book:', books[0]);
            
            // Check if the ID looks like a UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(books[0].id);
            console.log('- First book ID is UUID format:', isUuid);
        }
        
        // Get chapters for the first book
        if (books.length > 0) {
            const bookId = books[0].id;
            const chapter = await DatabaseService.getChapterByNumber(bookId, 1);
            if (chapter) {
                console.log('Chapter data:');
                console.log('- Chapter ID:', chapter.id, '(type:', typeof chapter.id, ')');
                console.log('- Chapter book_id:', chapter.book_id, '(type:', typeof chapter.book_id, ')');
                console.log('- Chapter:', chapter);
                
                // Check if the IDs look like UUIDs
                const chapterIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.id);
                const bookIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.book_id);
                console.log('- Chapter ID is UUID format:', chapterIdIsUuid);
                console.log('- Chapter book_id is UUID format:', bookIdIsUuid);
            } else {
                console.log('No chapter found for book:', bookId);
            }
        }
        
        // Check current app state
        if (window.bookReader) {
            console.log('Current app state:');
            console.log('- Current book ID:', window.bookReader.currentBookId, '(type:', typeof window.bookReader.currentBookId, ')');
            console.log('- Current chapter ID:', window.bookReader.currentChapterId, '(type:', typeof window.bookReader.currentChapterId, ')');
        }
        
    } catch (error) {
        console.error('Error testing ID types:', error);
    }
}

// Run the test
testIdTypes();
