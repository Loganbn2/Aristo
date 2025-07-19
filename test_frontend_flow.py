#!/usr/bin/env python3
"""
Test if we can reproduce the frontend behavior in Python
"""
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_frontend_flow():
    """Reproduce the frontend flow in Python"""
    
    print("1. Testing /api/config endpoint...")
    
    # Test the config endpoint (like frontend does)
    try:
        response = requests.get('http://localhost:5002/api/config')
        if response.status_code == 200:
            config = response.json()
            print("✅ Config endpoint success")
            print(f"Config: {config}")
            
            # Extract Supabase config
            supabase_url = config['supabase']['url']
            supabase_key = config['supabase']['anonKey']
            
            print(f"\n2. Testing Supabase with frontend config...")
            print(f"URL: {supabase_url}")
            print(f"Key length: {len(supabase_key) if supabase_key else 0}")
            
            # Test if this is a valid configuration
            if supabase_url and supabase_key and 'supabase.co' in supabase_url:
                print("✅ Configuration looks valid")
                
                # Test the actual query (like DatabaseService.getBooks())
                headers = {
                    'apikey': supabase_key,
                    'Authorization': f'Bearer {supabase_key}',
                    'Content-Type': 'application/json'
                }
                
                books_response = requests.get(
                    f"{supabase_url}/rest/v1/books?select=*&order=created_at.desc",
                    headers=headers
                )
                
                if books_response.status_code == 200:
                    books = books_response.json()
                    print(f"✅ Books query successful! Found {len(books)} books")
                    for book in books:
                        print(f"  - {book['title']} by {book['author']}")
                else:
                    print(f"❌ Books query failed: {books_response.status_code}")
                    print(f"Response: {books_response.text}")
            else:
                print("❌ Invalid configuration")
                
        else:
            print(f"❌ Config endpoint failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_frontend_flow()
