# Deploying Aristo to Render

This guide will help you deploy the Aristo reading assistant to Render.

## Prerequisites

1. GitHub account with your Aristo repository
2. Render account (free tier available)
3. OpenAI API key (optional but recommended)
4. Supabase project (optional)

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure these files are in your repository:
- `requirements.txt` (with all dependencies)
- `app.py` (main Flask application)
- `.env.example` (template for environment variables)
- `.gitignore` (excluding `.env`)

### 2. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `aristo-reading-assistant`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`

### 3. Set Environment Variables

In your Render service dashboard, go to Environment tab and add:

```
OPENAI_API_KEY=sk-your-actual-openai-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_PORT=10000
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

### 4. Deploy

1. Click "Create Web Service"
2. Render will automatically deploy your application
3. Your app will be available at: `https://your-service-name.onrender.com`

## Optional: Custom Domain

1. In your service settings, go to "Custom Domains"
2. Add your domain name
3. Configure DNS settings as shown by Render

## Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | Enables AI assistant features |
| `SUPABASE_URL` | No | Database connection |
| `SUPABASE_ANON_KEY` | No | Database authentication |
| `FLASK_ENV` | Yes | Set to `production` |
| `FLASK_DEBUG` | Yes | Set to `False` |
| `FLASK_PORT` | Yes | Set to `10000` (Render default) |

## Features Without API Keys

Even without API keys, Aristo will work with:
- ✅ Mock book data for reading
- ✅ Local notes and highlights
- ✅ Reading progress tracking
- ✅ Settings and customization
- ✅ Fallback AI responses

## Troubleshooting

### Build Fails
- Check `requirements.txt` has all dependencies
- Ensure Python version compatibility

### App Won't Start
- Verify `FLASK_PORT=10000` is set
- Check logs for error messages

### Missing Features
- Verify environment variables are set correctly
- Check API key validity

## Cost Considerations

- **Render**: Free tier available (some limitations)
- **OpenAI**: Pay-per-use (very affordable for personal use)
- **Supabase**: Free tier with generous limits

## Security

- ✅ Environment variables are secure
- ✅ API keys never exposed to frontend
- ✅ HTTPS enforced by Render
- ✅ No sensitive data in repository
