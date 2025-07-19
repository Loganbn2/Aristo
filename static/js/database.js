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
        await ensureSupabaseReady();
        
        if (!isSupabaseConfigured()) {
            return { ...highlight, id: 'mock-highlight-id' }; // Return mock highlight
        }

        const { data, error } = await supabaseClient
            .from('highlights')
            .insert(highlight)
            .select()
            .single();
        
        if (error) throw error;
        return data;
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
}
