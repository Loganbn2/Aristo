// Minimal test script to run in browser console
// This bypasses ALL existing logic and tests database insertion directly

console.log('🧪 MINIMAL HIGHLIGHT TEST - Starting...');

async function testMinimalHighlight() {
    try {
        // Wait for Supabase to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create the absolute minimum highlight object
        const testHighlight = {
            book_id: '2b154c7a-5485-483e-982e-8425ec7d67d6',
            chapter_id: '1', 
            selected_text: 'Test highlight for schema debugging',
            highlight_type: 'analysis'
        };
        
        console.log('🧪 Test highlight object:', testHighlight);
        console.log('🧪 Object keys:', Object.keys(testHighlight));
        console.log('🧪 JSON serialization:', JSON.stringify(testHighlight));
        
        // Check highlight_type specifically
        console.log('🧪 highlight_type value:', testHighlight.highlight_type);
        console.log('🧪 highlight_type type:', typeof testHighlight.highlight_type);
        console.log('🧪 highlight_type === null:', testHighlight.highlight_type === null);
        
        // Try direct Supabase insertion (bypassing our service)
        console.log('🧪 Attempting direct Supabase insertion...');
        
        // Get Supabase client directly
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (!config.supabase.url || !config.supabase.anonKey) {
            throw new Error('Supabase not configured');
        }
        
        const supabaseClient = supabase.createClient(config.supabase.url, config.supabase.anonKey);
        
        console.log('🧪 Supabase client created');
        
        // Direct insertion
        const { data, error } = await supabaseClient
            .from('highlights')
            .insert(testHighlight)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Direct Supabase error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error details:', error.details);
            throw error;
        }
        
        console.log('✅ SUCCESS! Direct insertion worked:', data);
        
        // Clean up
        if (data.id) {
            await supabaseClient.from('highlights').delete().eq('id', data.id);
            console.log('🧹 Cleaned up test record');
        }
        
    } catch (error) {
        console.error('❌ Minimal test failed:', error);
        console.error('❌ Error message:', error.message);
        
        if (error.message && error.message.includes('null value')) {
            console.error('🚨 NULL VALUE ERROR - This means the database schema requires highlight_type but something is converting our value to null');
            console.error('🚨 Possible causes:');
            console.error('   1. Database trigger converting the value');
            console.error('   2. RLS policy blocking the insertion');
            console.error('   3. Column datatype issue');
            console.error('   4. Supabase client serialization issue');
        }
    }
}

// Run the test
testMinimalHighlight();
