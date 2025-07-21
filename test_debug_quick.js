// Quick test to check database configuration and ID types
// Run this in browser console after the app loads

async function quickDebugTest() {
    console.log('=== QUICK DEBUG TEST ===');
    
    try {
        // Check database configuration
        const isReal = await DatabaseService.isUsingRealDatabase();
        const isMock = await DatabaseService.isUsingMockData();
        console.log('Database status:');
        console.log('- Using real database:', isReal);
        console.log('- Using mock data:', isMock);
        
        // Check current app state
        if (window.bookReader) {
            console.log('App state:');
            console.log('- Current book ID:', window.bookReader.currentBookId);
            console.log('- Current chapter ID:', window.bookReader.currentChapterId);
            console.log('- Book loaded:', !!window.bookReader.book);
        }
        
        // Get sample data to check ID formats
        const books = await DatabaseService.getBooks();
        console.log('Sample books:', books.slice(0, 2));
        
        if (books.length > 0) {
            const chapter = await DatabaseService.getChapterByNumber(books[0].id, 1);
            console.log('Sample chapter:', chapter);
        }
        
    } catch (error) {
        console.error('Error in debug test:', error);
    }
}

// Run immediately
quickDebugTest();
