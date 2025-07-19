#!/usr/bin/env python3
"""
Test Supabase connection using the configuration from .env
"""
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_supabase_connection():
    """Test the Supabase connection using direct API calls"""
    
    # Get configuration
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    print("Testing Supabase connection...")
    print(f"URL: {supabase_url}")
    print(f"Key: {supabase_anon_key[:20]}..." if supabase_anon_key else "No key")
    
    if not supabase_url or not supabase_anon_key:
        print("❌ Missing Supabase configuration")
        return False
    
    # Test connection by trying to query the books table
    try:
        headers = {
            'apikey': supabase_anon_key,
            'Authorization': f'Bearer {supabase_anon_key}',
            'Content-Type': 'application/json'
        }
        
        # Try a simple query to the books table
        response = requests.get(
            f"{supabase_url}/rest/v1/books?select=*&limit=1",
            headers=headers,
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Supabase connection successful!")
            print(f"Data: {data}")
            return True
        else:
            print(f"❌ Supabase query failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during Supabase test: {e}")
        return False

if __name__ == "__main__":
    test_supabase_connection()
