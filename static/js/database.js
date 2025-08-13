// Supabase configuration - will be loaded from API
let SUPABASE_URL = null;
let SUPABASE_ANON_KEY = null;
let supabaseClient = null;

// Promise that resolves when Supabase is initialized
let supabaseInitialized = null;

// Initialize Supabase client with configuration from backend
async function initializeSupabase() {
    try {
        console.log('Fetching Supabase configuration...');
        const response = await fetch('/api/config');
        const config = await response.json();
        
        console.log('Received config:', config);
        
        SUPABASE_URL = config.supabase.url;
        SUPABASE_ANON_KEY = config.supabase.anonKey;
        
        console.log('Setting Supabase config:', {
            url: SUPABASE_URL,
            keyLength: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0
        });
        
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client initialized successfully');
            console.log('Client object:', supabaseClient);
        } else {
            console.log('⚠️ Supabase configuration not available, using mock data');
        }
    } catch (error) {
        console.error('❌ Error loading configuration:', error);
        console.log('Falling back to mock data');
    }
}

// Initialize and store the promise
supabaseInitialized = initializeSupabase();

// Helper function to ensure Supabase is ready before database operations
async function ensureSupabaseReady() {
    await supabaseInitialized;
}

// Mock data for testing when Supabase isn't configured
const MOCK_DATA = {
    books: [
        {
            id: '1',
            title: 'The Art of Reading',
            author: 'John Doe',
            description: 'A comprehensive guide to effective reading techniques.',
            created_at: '2024-01-01'
        },
        {
            id: '2', 
            title: 'Advanced Study Methods',
            author: 'Jane Smith',
            description: 'Proven strategies for academic success.',
            created_at: '2024-01-02'
        }
    ],
    chapters: [
        {
            id: '1',
            book_id: '1',
            chapter_number: 1,
            title: 'The Beginning',
            content: 'This is the beginning of our journey into the art of reading. Reading is not just about consuming words on a page; it\'s about understanding, analyzing, and synthesizing information to create knowledge and wisdom.'
        },
        {
            id: '2',
            book_id: '1', 
            chapter_number: 2,
            title: 'Understanding Context',
            content: 'Context is everything in reading. Without proper context, even the most beautifully written passages can lose their meaning and impact.'
        },
        {
            id: '3',
            book_id: '2',
            chapter_number: 1,
            title: 'Introduction to Study Methods',
            content: 'Effective study methods are the foundation of academic success. This chapter introduces the core concepts that will guide your learning journey.'
        }
    ]
};

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
    const configured = supabaseClient !== null && 
           SUPABASE_URL && 
           SUPABASE_ANON_KEY &&
           SUPABASE_URL.includes('supabase.co');
    
    console.log('Supabase configuration check:', {
        supabaseClient: supabaseClient !== null,
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_ANON_KEY,
        urlValid: SUPABASE_URL ? SUPABASE_URL.includes('supabase.co') : false,
        configured
    });
    
    return configured;
};

// Database service for book operations
class DatabaseService {
    // Utility methods
    static async isUsingRealDatabase() {
        await ensureSupabaseReady();
        return isSupabaseConfigured();
    }
    
    static async isUsingMockData() {
        await ensureSupabaseReady();
        return !isSupabaseConfigured();
    }
    
    // Debug method to inspect table structure
    static async inspectHighlightsTable() {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('🔍 TABLE INSPECTION: Using mock data, no real table to inspect');
            return {
                isReal: false,
                mockStructure: {
                    highlights: ['id', 'book_id', 'chapter_id', 'title', 'content', 'selected_text', 'highlight_type', 'created_at']
                }
            };
        }
        
        console.log('🔍 INSPECTING HIGHLIGHTS TABLE STRUCTURE...');
        
        try {
            // Try to get a sample record to see the structure
            const { data: sampleData, error: sampleError } = await supabaseClient
                .from('highlights')
                .select('*')
                .limit(1);
            
            console.log('🎯 SAMPLE HIGHLIGHTS QUERY:');
            console.log('- Table: highlights');
            console.log('- Operation: SELECT *');
            console.log('- Limit: 1');
            console.log('- Error:', sampleError);
            console.log('- Sample data:', sampleData);
            
            let availableColumns = [];
            if (sampleData && sampleData.length > 0) {
                availableColumns = Object.keys(sampleData[0]);
                console.log('📋 AVAILABLE COLUMNS IN HIGHLIGHTS TABLE:');
                availableColumns.forEach((col, index) => {
                    const value = sampleData[0][col];
                    const type = typeof value;
                    console.log(`  ${index + 1}. ${col}: ${value} (${type})`);
                });
            } else {
                console.log('⚠️ No sample data found, trying to insert a test record to discover schema...');
                
                // Try a minimal insert to see what columns are required
                const testData = { test_field: 'test_value' };
                const { data: testInsert, error: testError } = await supabaseClient
                    .from('highlights')
                    .insert(testData)
                    .select();
                
                console.log('🧪 TEST INSERT RESULT:');
                console.log('- Test data:', testData);
                console.log('- Error:', testError);
                console.log('- Response:', testInsert);
                
                if (testError) {
                    console.log('📋 ERROR REVEALS SCHEMA INFO:');
                    console.log('- Error message:', testError.message);
                    console.log('- Error details:', testError.details);
                    console.log('- Error hint:', testError.hint);
                }
            }
            
            return {
                isReal: true,
                availableColumns,
                sampleData: sampleData?.[0],
                sampleError
            };
            
        } catch (error) {
            console.error('❌ Error inspecting table:', error);
            return {
                isReal: true,
                error: error.message
            };
        }
    }
    
    // Books
    static async getBooks() {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return MOCK_DATA.books;
        }

        const { data, error } = await supabaseClient
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    static async getBook(bookId) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            const book = MOCK_DATA.books.find(book => book.id === bookId);
            if (book) {
                // Add chapters to the book
                const chapters = MOCK_DATA.chapters.filter(chapter => chapter.book_id === bookId);
                return { ...book, chapters };
            }
            return null;
        }

        const { data, error } = await supabaseClient
            .from('books')
            .select(`
                *,
                chapters (
                    id,
                    chapter_number,
                    title,
                    content,
                    word_count
                )
            `)
            .eq('id', bookId)
            .single();
        
        if (error) throw error;
        return data;
    }

    static async createBook(book) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { ...book, id: String(MOCK_DATA.books.length + 1), created_at: new Date().toISOString() };
        }

        const { data, error } = await supabaseClient
            .from('books')
            .insert(book)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Add a complete book with chapters
    static async addBook(bookJson) {
        await ensureSupabaseReady();
        
        try {
            // Parse the JSON if it's a string
            const bookData = typeof bookJson === 'string' ? JSON.parse(bookJson) : bookJson;
            
            // Validate required fields
            if (!bookData.title || !bookData.author) {
                throw new Error('Book must have title and author');
            }
            
            if (!bookData.chapters || !Array.isArray(bookData.chapters)) {
                throw new Error('Book must have chapters array');
            }

            // Create the book record
            const bookRecord = {
                title: bookData.title,
                author: bookData.author,
                description: bookData.description || '',
                created_at: new Date().toISOString()
            };

            let book;
            if (!isSupabaseConfigured()) {
                // Mock mode - add to mock data
                book = { 
                    ...bookRecord, 
                    id: String(MOCK_DATA.books.length + 1)
                };
                MOCK_DATA.books.push(book);
            } else {
                // Create book in Supabase
                const { data, error } = await supabaseClient
                    .from('books')
                    .insert(bookRecord)
                    .select()
                    .single();
                
                if (error) throw error;
                book = data;
            }

            // Create chapters
            const chapters = [];
            for (const chapterData of bookData.chapters) {
                if (!chapterData.number || !chapterData.title || !chapterData.text) {
                    console.warn('Skipping invalid chapter:', chapterData);
                    continue;
                }

                const chapterRecord = {
                    book_id: book.id,
                    chapter_number: chapterData.number,
                    title: chapterData.title,
                    content: chapterData.text,
                    word_count: chapterData.text.split(/\s+/).length
                };

                if (!isSupabaseConfigured()) {
                    // Mock mode
                    const chapter = {
                        ...chapterRecord,
                        id: String(MOCK_DATA.chapters.length + 1)
                    };
                    MOCK_DATA.chapters.push(chapter);
                    chapters.push(chapter);
                } else {
                    // Create chapter in Supabase
                    const { data, error } = await supabaseClient
                        .from('chapters')
                        .insert(chapterRecord)
                        .select()
                        .single();
                    
                    if (error) {
                        console.error('Error creating chapter:', error);
                        continue;
                    }
                    chapters.push(data);
                }
            }

            return {
                book,
                chapters,
                success: true,
                message: `Successfully added "${book.title}" with ${chapters.length} chapters`
            };

        } catch (error) {
            console.error('Error adding book:', error);
            return {
                success: false,
                message: error.message || 'Failed to add book'
            };
        }
    }

    // Chapters
    static async getChapter(chapterId) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return MOCK_DATA.chapters.find(chapter => chapter.id === chapterId);
        }

        const { data, error } = await supabaseClient
            .from('chapters')
            .select('*')
            .eq('id', chapterId)
            .single();
        
        if (error) throw error;
        return data;
    }

    static async getChapterByNumber(bookId, chapterNumber) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return MOCK_DATA.chapters.find(chapter => chapter.book_id === bookId && chapter.chapter_number === chapterNumber);
        }

        const { data, error } = await supabaseClient
            .from('chapters')
            .select('*')
            .eq('book_id', bookId)
            .eq('chapter_number', chapterNumber)
            .single();
        
        if (error) throw error;
        return data;
    }

    static async createChapter(chapter) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { ...chapter, id: String(MOCK_DATA.chapters.length + 1) };
        }

        const { data, error } = await supabaseClient
            .from('chapters')
            .insert(chapter)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Highlights
    static async getHighlights(bookId, chapterId = null) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return []; // Return empty array for highlights in mock
        }

        let query = supabaseClient
            .from('highlights')
            .select('*')
            .eq('book_id', bookId);
        
        if (chapterId) {
            query = query.eq('chapter_id', chapterId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: true });
        
        if (error) throw error;
        return data;
    }

    static async createHighlight(highlight) {
        console.log('=== DATABASE CREATE HIGHLIGHT DEBUG ===');
        console.log('🔍 RECEIVED INPUT - Raw highlight object:', highlight);
        
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('Supabase not configured, returning mock highlight');
            return { ...highlight, id: 'mock-highlight-' + Date.now() };
        }

        console.log('Supabase configured, processing highlight for database...');
        
        // Check if we're dealing with UUID vs string IDs
        const isBookIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(highlight.book_id);
        const isChapterIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(highlight.chapter_id);
        
        console.log('📋 ID Format Analysis:');
        console.log('- Book ID:', highlight.book_id, '(UUID format:', isBookIdUuid, ')');
        console.log('- Chapter ID:', highlight.chapter_id, '(UUID format:', isChapterIdUuid, ')');
        
        // If we have string IDs but need UUIDs, we need to look up the actual UUIDs
        let processedHighlight = { ...highlight };
        
        if (!isBookIdUuid || !isChapterIdUuid) {
            console.log('⚠️ Non-UUID IDs detected. Attempting to resolve to UUIDs...');
            
            try {
                // If book_id is not a UUID, try to find the book record to get its UUID
                if (!isBookIdUuid) {
                    console.log('🔍 Looking up book UUID for book_id:', highlight.book_id);
                    
                    console.log('🎯 SUPABASE QUERY - Books Table:');
                    console.log('- Table: books');
                    console.log('- Operation: SELECT');
                    console.log('- Columns: id, title');
                    console.log('- Limit: 10');
                    
                    // Query books table to find the UUID for this book
                    const { data: books, error: bookError } = await supabaseClient
                        .from('books')
                        .select('id, title')
                        .limit(10);
                    
                    console.log('🎯 BOOKS QUERY RESPONSE:');
                    console.log('- Error:', bookError);
                    console.log('- Data count:', books ? books.length : 0);
                    console.log('- Books data:', books);
                        
                    if (books && books.length > 0) {
                        console.log('📚 Available books with UUIDs:');
                        books.forEach((book, index) => {
                            console.log(`  ${index + 1}. ${book.title}: ${book.id}`);
                        });
                        // For now, use the first book's UUID if we can't match
                        processedHighlight.book_id = books[0].id;
                        console.log('📚 MAPPING: Using first available book UUID:', processedHighlight.book_id);
                    } else {
                        console.log('❌ No books found in database');
                    }
                }
                
                // If chapter_id is not a UUID, try to find the chapter record to get its UUID
                if (!isChapterIdUuid) {
                    console.log('🔍 Looking up chapter UUID for chapter_id:', highlight.chapter_id);
                    
                    console.log('🎯 SUPABASE QUERY - Chapters Table:');
                    console.log('- Table: chapters');
                    console.log('- Operation: SELECT');
                    console.log('- Columns: id, chapter_number, book_id, title');
                    console.log('- Filter: book_id =', processedHighlight.book_id);
                    console.log('- Limit: 10');
                    
                    // Query chapters table to find the UUID for this chapter
                    const { data: chapters, error: chapterError } = await supabaseClient
                        .from('chapters')
                        .select('id, chapter_number, book_id, title')
                        .eq('book_id', processedHighlight.book_id)
                        .limit(10);
                    
                    console.log('🎯 CHAPTERS QUERY RESPONSE:');
                    console.log('- Error:', chapterError);
                    console.log('- Data count:', chapters ? chapters.length : 0);
                    console.log('- Chapters data:', chapters);
                        
                    if (chapters && chapters.length > 0) {
                        console.log('📄 Available chapters with UUIDs:');
                        chapters.forEach((chapter, index) => {
                            console.log(`  ${index + 1}. Chapter ${chapter.chapter_number} (${chapter.title}): ${chapter.id}`);
                        });
                        
                        // Try to find chapter by number (assuming highlight.chapter_id might be a chapter number)
                        console.log(`🔍 Looking for chapter number: ${highlight.chapter_id}`);
                        const targetChapter = chapters.find(c => c.chapter_number.toString() === highlight.chapter_id.toString());
                        
                        if (targetChapter) {
                            processedHighlight.chapter_id = targetChapter.id;
                            console.log('📄 MAPPING: Found matching chapter by number');
                            console.log(`   Chapter ${targetChapter.chapter_number} -> UUID: ${targetChapter.id}`);
                        } else {
                            processedHighlight.chapter_id = chapters[0].id;
                            console.log('📄 MAPPING: No exact match, using first chapter');
                            console.log(`   Chapter ${chapters[0].chapter_number} -> UUID: ${chapters[0].id}`);
                        }
                    } else {
                        console.log('❌ No chapters found for book:', processedHighlight.book_id);
                    }
                }
                
            } catch (lookupError) {
                console.error('❌ Error looking up UUIDs:', lookupError);
                // Continue with original IDs and see what happens
            }
        }
        
        console.log('📋 Final processed highlight:', processedHighlight);
        
        try {
            console.log('🔒 FINAL PRE-INSERT VALIDATION:');
            console.log('- highlight_type value:', processedHighlight.highlight_type);
            console.log('- highlight_type type:', typeof processedHighlight.highlight_type);
            console.log('- is valid value:', ['context', 'analysis'].includes(processedHighlight.highlight_type));
            console.log('- book_id format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processedHighlight.book_id));
            console.log('- chapter_id format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processedHighlight.chapter_id));
            
            // Enhanced logging for exact Supabase operation
            console.log('🎯 SUPABASE INSERT OPERATION DETAILS:');
            console.log('- Target table: highlights');
            console.log('- Operation: INSERT');
            console.log('- Data being sent to database:');
            console.table(processedHighlight);
            console.log('- Raw data object:', JSON.stringify(processedHighlight, null, 2));
            console.log('- Column mapping:');
            Object.keys(processedHighlight).forEach(key => {
                console.log(`  ${key} -> ${processedHighlight[key]} (${typeof processedHighlight[key]})`);
            });
            console.log('- SQL equivalent would be something like:');
            const columns = Object.keys(processedHighlight).join(', ');
            const values = Object.values(processedHighlight).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
            console.log(`  INSERT INTO highlights (${columns}) VALUES (${values});`);
            
            // Use the processed highlight for insertion
            const { data, error } = await supabaseClient
                .from('highlights')
                .insert(processedHighlight)
                .select()
                .single();
            
            console.log('🎯 SUPABASE RESPONSE:');
            console.log('- Insert operation completed');
            console.log('- Error:', error);
            console.log('- Returned data:', data);
            if (error) {
                console.log('- Error code:', error.code);
                console.log('- Error message:', error.message);
                console.log('- Error details:', error.details);
                console.log('- Error hint:', error.hint);
            }
            
            if (error) {
                console.error('❌ Supabase error:', error);
                
                // If we get a UUID error, try omitting the problematic ID fields and let the database auto-generate
                if (error.message && error.message.includes('uuid')) {
                    console.log('🔄 UUID error - trying without explicit IDs...');
                    
                    const noIdHighlight = {
                        selected_text: processedHighlight.selected_text,
                        highlight_type: processedHighlight.highlight_type
                    };
                    
                    console.log('🎯 RETRY SUPABASE INSERT (NO IDs):');
                    console.log('- Target table: highlights');
                    console.log('- Operation: INSERT (without IDs)');
                    console.log('- Data being sent:');
                    console.table(noIdHighlight);
                    console.log('- Raw data:', JSON.stringify(noIdHighlight, null, 2));
                    
                    const { data: noIdData, error: noIdError } = await supabaseClient
                        .from('highlights')
                        .insert(noIdHighlight)
                        .select()
                        .single();
                    
                    console.log('🎯 RETRY SUPABASE RESPONSE:');
                    console.log('- Error:', noIdError);
                    console.log('- Returned data:', noIdData);
                        
                    if (noIdError) {
                        console.error('❌ No-ID insert failed:', noIdError);
                        throw noIdError;
                    }
                    
                    console.log('✅ No-ID insert succeeded:', noIdData);
                    return noIdData;
                }
                
                // If we get a column error, try with even fewer fields
                if (error.message && error.message.includes('column')) {
                    console.log('🔄 Column error - trying with minimum fields only...');
                    
                    const minimalHighlight = {
                        selected_text: processedHighlight.selected_text
                    };
                    
                    console.log('🎯 MINIMAL SUPABASE INSERT:');
                    console.log('- Target table: highlights');
                    console.log('- Operation: INSERT (minimal fields only)');
                    console.log('- Data being sent:');
                    console.table(minimalHighlight);
                    console.log('- Raw data:', JSON.stringify(minimalHighlight, null, 2));
                    console.log('- Only column: selected_text');
                    
                    const { data: minData, error: minError } = await supabaseClient
                        .from('highlights')
                        .insert(minimalHighlight)
                        .select()
                        .single();
                    
                    console.log('🎯 MINIMAL SUPABASE RESPONSE:');
                    console.log('- Error:', minError);
                    console.log('- Returned data:', minData);
                        
                    if (minError) {
                        console.error('❌ Minimal insert failed:', minError);
                        console.log('- Minimal error code:', minError.code);
                        console.log('- Minimal error message:', minError.message);
                        console.log('- Minimal error details:', minError.details);
                        throw minError;
                    }
                    
                    console.log('✅ Minimal insert succeeded:', minData);
                    return minData;
                }
                
                throw error;
            }
            
            console.log('✅ Highlight created successfully!');
            console.log('🎯 SUCCESSFUL INSERT RESULT:');
            console.log('- Returned data:', data);
            console.log('- Generated ID:', data?.id);
            console.log('- Final record in database:');
            console.table(data);
            if (data) {
                console.log('- Database assigned columns:');
                Object.keys(data).forEach(key => {
                    console.log(`  ${key}: ${data[key]} (${typeof data[key]})`);
                });
            }
            return data;
            
        } catch (dbError) {
            console.error('❌ Database error in createHighlight:', dbError);
            console.error('Error type:', typeof dbError);
            console.error('Error toString:', dbError.toString());
            if (dbError.message) {
                console.error('Error message:', dbError.message);
            }
            throw dbError;
        }
    }

    static async updateHighlight(id, updates) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { id, ...updates }; // Return mock updated highlight
        }

        const { data, error } = await supabaseClient
            .from('highlights')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    static async deleteHighlight(id) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return; // Do nothing in mock
        }

        const { error } = await supabaseClient
            .from('highlights')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }

    // Reading Progress
    static async getReadingProgress(bookId) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return null; // Return null in mock
        }

        const { data, error } = await supabaseClient
            .from('reading_progress')
            .select('*')
            .eq('book_id', bookId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return data;
    }

    static async updateReadingProgress(bookId, progress) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { book_id: bookId, ...progress, last_read_at: new Date().toISOString() }; // Return mock progress
        }

        const { data, error } = await supabaseClient
            .from('reading_progress')
            .upsert({
                book_id: bookId,
                ...progress,
                last_read_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Notes
    static async getNotes(bookId, chapterId = null) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return []; // Return empty array for notes in mock
        }

        let query = supabaseClient
            .from('notes')
            .select('*')
            .eq('book_id', bookId);
        
        if (chapterId) {
            query = query.eq('chapter_id', chapterId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: true });
        
        if (error) throw error;
        return data;
    }

    static async createNote(note) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { 
                ...note, 
                id: 'mock-note-' + Date.now(), 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }

        const { data, error } = await supabaseClient
            .from('notes')
            .insert(note)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    static async updateNote(id, updates) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { 
                id, 
                ...updates, 
                updated_at: new Date().toISOString() 
            };
        }

        const { data, error } = await supabaseClient
            .from('notes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    static async deleteNote(id) {
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return; // Do nothing in mock
        }

        const { error } = await supabaseClient
            .from('notes')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }

    // Audio Cache
    static async getCachedAudio(cacheKey) {
        console.log('🔍 Checking for cached audio:', cacheKey);
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured, no audio cache available');
            return null;
        }

        try {
            const { data, error } = await supabaseClient
                .from('audio_cache')
                .select('*')
                .eq('cache_key', cacheKey)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('❌ Error fetching cached audio:', error);
                return null;
            }
            
            if (data) {
                console.log('✅ Found cached audio:', {
                    cache_key: data.cache_key,
                    voice: data.voice,
                    model: data.model,
                    created_at: data.created_at,
                    audio_size: data.audio_data ? data.audio_data.length : 0
                });
                return data;
            } else {
                console.log('📭 No cached audio found for key:', cacheKey);
                return null;
            }
        } catch (error) {
            console.error('❌ Error accessing audio cache:', error);
            return null;
        }
    }

    static async saveCachedAudio(cacheKey, audioData, voice, model, textHash = null) {
        console.log('💾 Saving audio to cache:', {
            cache_key: cacheKey,
            voice: voice,
            model: model,
            audio_size: audioData ? audioData.length : 0,
            text_hash: textHash
        });
        
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured, cannot save audio cache');
            return null;
        }

        try {
            const cacheRecord = {
                cache_key: cacheKey,
                audio_data: audioData,
                voice: voice,
                model: model,
                text_hash: textHash,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabaseClient
                .from('audio_cache')
                .upsert(cacheRecord, {
                    onConflict: 'cache_key'
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Error saving audio cache:', error);
                return null;
            }
            
            console.log('✅ Audio cached successfully:', {
                id: data.id,
                cache_key: data.cache_key,
                voice: data.voice,
                model: data.model,
                created_at: data.created_at
            });
            
            return data;
        } catch (error) {
            console.error('❌ Error saving to audio cache:', error);
            return null;
        }
    }

    static async clearAudioCache(cacheKeyPattern = null) {
        console.log('🗑️ Clearing audio cache:', cacheKeyPattern ? `pattern: ${cacheKeyPattern}` : 'all entries');
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured, cannot clear audio cache');
            return { cleared: 0 };
        }

        try {
            let query = supabaseClient.from('audio_cache');
            
            if (cacheKeyPattern) {
                // Clear entries matching a pattern (e.g., specific chapter or book)
                query = query.delete().ilike('cache_key', `${cacheKeyPattern}%`);
            } else {
                // Clear all cache entries
                query = query.delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible UUID
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Error clearing audio cache:', error);
                return { cleared: 0, error: error.message };
            }
            
            const clearedCount = Array.isArray(data) ? data.length : 0;
            console.log(`✅ Cleared ${clearedCount} audio cache entries`);
            
            return { cleared: clearedCount };
        } catch (error) {
            console.error('❌ Error clearing audio cache:', error);
            return { cleared: 0, error: error.message };
        }
    }

    static async getAudioCacheStats() {
        console.log('📊 Getting audio cache statistics');
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { total: 0, size: 0, oldest: null, newest: null };
        }

        try {
            const { data, error } = await supabaseClient
                .from('audio_cache')
                .select('id, cache_key, voice, model, created_at, audio_data')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Error getting cache stats:', error);
                return { total: 0, size: 0, oldest: null, newest: null, error: error.message };
            }
            
            const stats = {
                total: data.length,
                size: data.reduce((sum, item) => sum + (item.audio_data ? item.audio_data.length : 0), 0),
                oldest: data.length > 0 ? data[data.length - 1].created_at : null,
                newest: data.length > 0 ? data[0].created_at : null,
                voices: [...new Set(data.map(item => item.voice))],
                models: [...new Set(data.map(item => item.model))]
            };
            
            console.log('📊 Audio cache stats:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Error getting cache stats:', error);
            return { total: 0, size: 0, oldest: null, newest: null, error: error.message };
        }
    }

    // New methods for chapter-based audio storage
    static async saveChapterAudio(chapterId, audioData, voice, model) {
        console.log('💾 Saving chapter audio:', chapterId);
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured, cannot save chapter audio');
            return false;
        }

        try {
            const { data, error } = await supabaseClient
                .from('chapters')
                .update({
                    audio_data: audioData,
                    audio_voice: voice,
                    audio_model: model,
                    audio_generated_at: new Date().toISOString()
                })
                .eq('id', chapterId);

            if (error) {
                console.error('❌ Error saving chapter audio:', error);
                return false;
            }

            console.log('✅ Chapter audio saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Error saving chapter audio:', error);
            return false;
        }
    }

    static async getChapterAudio(chapterId, requiredVoice, requiredModel) {
        console.log('🔍 Getting chapter audio:', chapterId, requiredVoice, requiredModel);
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured, no chapter audio available');
            return null;
        }

        try {
            const { data, error } = await supabaseClient
                .from('chapters')
                .select('audio_data, audio_voice, audio_model, audio_generated_at')
                .eq('id', chapterId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('❌ Error fetching chapter audio:', error);
                return null;
            }
            
            if (data && data.audio_data && data.audio_voice === requiredVoice && data.audio_model === requiredModel) {
                console.log('✅ Found matching chapter audio:', {
                    voice: data.audio_voice,
                    model: data.audio_model,
                    generated_at: data.audio_generated_at,
                    audio_size: data.audio_data ? data.audio_data.length : 0
                });
                return data;
            } else {
                console.log('📭 No matching chapter audio found - voice/model mismatch or no audio');
                return null;
            }
        } catch (error) {
            console.error('❌ Error accessing chapter audio:', error);
            return null;
        }
    }
}
