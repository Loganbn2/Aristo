# Environment Configuration Setup

All API keys and configuration are now managed through environment variables for security and easy deployment.

## Local Development Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your actual values:**
   ```bash
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   
   # Supabase Configuration (if using)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Flask Configuration
   FLASK_ENV=development
   FLASK_DEBUG=True
   FLASK_PORT=5001
   ```

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Navigate to API Keys
4. Create a new secret key
5. Copy the key and add it to your `.env` file

### Supabase Keys (Optional)
1. Go to https://supabase.com/
2. Create a project or use existing one
3. Go to Settings → API
4. Copy the URL and anon/public key
5. Add them to your `.env` file

## Deployment to Render

When deploying to Render, set these environment variables in your Render dashboard:

1. Go to your Render service
2. Navigate to Environment tab
3. Add each variable from your `.env` file:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `FLASK_ENV=production`
   - `FLASK_DEBUG=False`
   - `FLASK_PORT=10000` (Render's default)

## Fallback Behavior

- **No OpenAI key**: Aristo provides helpful fallback responses
- **No Supabase**: App uses mock data for books and notes
- **Partial configuration**: App gracefully handles missing services

## Security Notes

- ✅ `.env` file is in `.gitignore` - won't be committed to git
- ✅ Environment variables are loaded securely
- ✅ Frontend only receives non-sensitive configuration
- ✅ API keys never exposed to client-side code
