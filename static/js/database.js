// Supabase configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://nrgilbecgssjgafqulth.supabase.co'  // Should look like: https://your-project.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yZ2lsYmVjZ3NzamdhZnF1bHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTI1NDIsImV4cCI6MjA2ODM2ODU0Mn0.fxFXgDuu9ZL8vDtXxCPiQpA2-7dDKihh9DT5IH7U9cU'  // Your project's anon/public key

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && 
           SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE' &&
           SUPABASE_URL.includes('supabase.co');
};

// Database service for book operations
class DatabaseService {
    // Books
    static async getBooks() {
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

    // Chapters
    static async getChapter(chapterId) {
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
}
