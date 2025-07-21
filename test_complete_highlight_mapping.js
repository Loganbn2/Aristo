// Complete highlight save test script
// This will test the complete field mapping process
// Copy and paste this into browser console after app loads

async function testCompleteHighlightMapping() {
    console.log('🎯 COMPLETE HIGHLIGHT FIELD MAPPING TEST');
    console.log('==========================================');
    
    try {
        // 1. Check current app state
        console.log('\n1️⃣ CURRENT APP STATE:');
        if (window.bookReader) {
            console.log('- Current book ID:', window.bookReader.currentBookId);
            console.log('- Current chapter ID:', window.bookReader.currentChapterId);
            console.log('- Book loaded:', !!window.bookReader.book);
            
            if (window.bookReader.book) {
                console.log('- Book title:', window.bookReader.book.title);
                console.log('- Current chapter number:', window.bookReader.currentChapterNumber);
            }
        } else {
            console.log('❌ BookReader not found');
            return;
        }
        
        // 2. Test database connection and table structure
        console.log('\n2️⃣ DATABASE STRUCTURE:');
        const tableInfo = await DatabaseService.inspectHighlightsTable();
        console.log('Table structure:', tableInfo);
        
        // 3. Test actual database queries for UUIDs
        console.log('\n3️⃣ UUID RESOLUTION TEST:');
        const isReal = await DatabaseService.isUsingRealDatabase();
        console.log('Using real database:', isReal);
        
        if (isReal) {
            // Test book UUID lookup
            const books = await DatabaseService.getBooks();
            console.log('Available books:');
            books.forEach((book, index) => {
                console.log(`  ${index + 1}. "${book.title}" -> ${book.id}`);
                console.log(`     UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id)}`);
            });
            
            // Test chapter UUID lookup
            if (books.length > 0) {
                const bookId = books[0].id;
                const chapter = await DatabaseService.getChapterByNumber(bookId, 1);
                if (chapter) {
                    console.log('Sample chapter:');
                    console.log(`  Chapter ${chapter.chapter_number}: "${chapter.title}" -> ${chapter.id}`);
                    console.log(`  Book ID: ${chapter.book_id}`);
                    console.log(`  UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapter.id)}`);
                }
            }
        }
        
        // 4. Create a test highlight with complete field mapping
        console.log('\n4️⃣ COMPLETE FIELD MAPPING TEST:');
        const testHighlight = {
            // Static fields
            title: 'Aristo Note',
            content: 'This is a test Aristo response that would normally come from the AI. It contains analysis or context about the selected text.',
            highlight_type: 'analysis',
            selected_text: 'This is a test selected text from the chapter that would be highlighted.',
            
            // Dynamic fields (current app state)
            book_id: window.bookReader.currentBookId,
            chapter_id: window.bookReader.currentChapterId
        };
        
        console.log('🎯 TEST HIGHLIGHT OBJECT:');
        console.log('- title:', testHighlight.title);
        console.log('- content length:', testHighlight.content.length);
        console.log('- highlight_type:', testHighlight.highlight_type);
        console.log('- selected_text length:', testHighlight.selected_text.length);
        console.log('- book_id:', testHighlight.book_id, '(type:', typeof testHighlight.book_id, ')');
        console.log('- chapter_id:', testHighlight.chapter_id, '(type:', typeof testHighlight.chapter_id, ')');
        
        console.log('\n🎯 FIELD MAPPING TO SUPABASE:');
        console.log('Frontend -> Supabase highlights table:');
        console.log('- title -> title column');
        console.log('- content -> content column');
        console.log('- highlight_type -> highlight_type column');
        console.log('- selected_text -> selected_text column');
        console.log('- book_id -> book_id column (will resolve to UUID)');
        console.log('- chapter_id -> chapter_id column (will resolve to UUID)');
        
        // 5. Test the actual save (optional - uncomment to test real save)
        /*
        console.log('\n5️⃣ ACTUAL SAVE TEST:');
        console.log('⚠️ Attempting to save test highlight to database...');
        try {
            const savedHighlight = await DatabaseService.createHighlight(testHighlight);
            console.log('✅ Test highlight saved successfully:', savedHighlight);
        } catch (error) {
            console.log('❌ Test highlight save failed:', error);
        }
        */
        
        console.log('\n✅ COMPLETE MAPPING TEST FINISHED');
        console.log('To test actual save, uncomment section 5 in the script');
        console.log('Now try the Save Highlight feature in the app to see all logging in action!');
        
    } catch (error) {
        console.error('❌ Error during mapping test:', error);
    }
}

// Run the test
testCompleteHighlightMapping();
