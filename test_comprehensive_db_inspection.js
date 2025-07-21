// Comprehensive database inspection script
// Copy and paste this into the browser console after the app loads

async function comprehensiveDbInspection() {
    console.log('🔍 COMPREHENSIVE DATABASE INSPECTION');
    console.log('=====================================');
    
    try {
        // 1. Check database configuration
        console.log('\n1️⃣ DATABASE CONFIGURATION:');
        const isReal = await DatabaseService.isUsingRealDatabase();
        const isMock = await DatabaseService.isUsingMockData();
        console.log('- Using real database:', isReal);
        console.log('- Using mock data:', isMock);
        
        // 2. Inspect highlights table structure
        console.log('\n2️⃣ HIGHLIGHTS TABLE INSPECTION:');
        const tableInfo = await DatabaseService.inspectHighlightsTable();
        console.log('Table inspection result:', tableInfo);
        
        // 3. Check current app state
        console.log('\n3️⃣ CURRENT APP STATE:');
        if (window.bookReader) {
            console.log('- Current book ID:', window.bookReader.currentBookId, '(type:', typeof window.bookReader.currentBookId, ')');
            console.log('- Current chapter ID:', window.bookReader.currentChapterId, '(type:', typeof window.bookReader.currentChapterId, ')');
            console.log('- Book loaded:', !!window.bookReader.book);
            
            if (window.bookReader.book) {
                console.log('- Book title:', window.bookReader.book.title);
                console.log('- Total chapters:', window.bookReader.totalChapters);
            }
        }
        
        // 4. Sample database records
        console.log('\n4️⃣ SAMPLE RECORDS FROM TABLES:');
        
        try {
            console.log('\nBooks table:');
            const books = await DatabaseService.getBooks();
            console.log('- Total books:', books.length);
            if (books.length > 0) {
                console.log('- First book:', books[0]);
                console.log('- Book ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(books[0].id));
            }
        } catch (error) {
            console.log('Error getting books:', error);
        }
        
        try {
            console.log('\nChapters table:');
            if (window.bookReader?.currentBookId) {
                const chapter = await DatabaseService.getChapterByNumber(window.bookReader.currentBookId, 1);
                console.log('- Sample chapter:', chapter);
                if (chapter) {
                    console.log('- Chapter ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.id));
                    console.log('- Book ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.book_id));
                }
            }
        } catch (error) {
            console.log('Error getting chapters:', error);
        }
        
        try {
            console.log('\nExisting highlights:');
            const highlights = await DatabaseService.getHighlights(window.bookReader?.currentBookId);
            console.log('- Total highlights:', highlights.length);
            if (highlights.length > 0) {
                console.log('- First highlight:', highlights[0]);
                console.log('- Highlight columns:', Object.keys(highlights[0]));
            }
        } catch (error) {
            console.log('Error getting highlights:', error);
        }
        
        console.log('\n✅ INSPECTION COMPLETE');
        console.log('You can now try saving a highlight to see the detailed column mapping.');
        
    } catch (error) {
        console.error('❌ Error during inspection:', error);
    }
}

// Run the inspection
comprehensiveDbInspection();
