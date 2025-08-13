#!/usr/bin/env python3
"""
Setup script for Aristo Audio Cache
This script helps create the audio_cache table in Supabase if it doesn't exist.
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_audio_cache_table():
    """Create the audio_cache table via Supabase REST API"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file")
        return False
    
    # Read the SQL file
    try:
        with open('supabase_audio_cache_table.sql', 'r') as f:
            sql_content = f.read()
    except FileNotFoundError:
        print("❌ Error: supabase_audio_cache_table.sql not found")
        return False
    
    print("🔍 Checking if audio_cache table exists...")
    
    # Check if table exists by trying to select from it
    headers = {
        'apikey': supabase_anon_key,
        'Authorization': f'Bearer {supabase_anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Try to query the table
    response = requests.get(
        f'{supabase_url}/rest/v1/audio_cache?select=id&limit=1',
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ audio_cache table already exists")
        return True
    elif response.status_code == 404:
        print("📝 audio_cache table does not exist, need to create it")
        print("⚠️  This script cannot directly execute SQL in Supabase.")
        print("📋 Please run the following SQL in your Supabase SQL Editor:")
        print("\n" + "="*50)
        print(sql_content)
        print("="*50)
        print("\nOR you can:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Copy and paste the contents of 'supabase_audio_cache_table.sql'")
        print("4. Run the SQL")
        return False
    else:
        print(f"❌ Error checking table: HTTP {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_audio_cache():
    """Test the audio cache functionality"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    headers = {
        'apikey': supabase_anon_key,
        'Authorization': f'Bearer {supabase_anon_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Test insert
    test_data = {
        'cache_key': 'test-audio-cache-key',
        'audio_data': '["test_base64_data"]',
        'voice': 'alloy',
        'model': 'tts-1'
    }
    
    print("🧪 Testing audio cache insert...")
    response = requests.post(
        f'{supabase_url}/rest/v1/audio_cache',
        headers=headers,
        json=test_data
    )
    
    if response.status_code in [200, 201]:
        print("✅ Test insert successful")
        inserted_data = response.json()
        if isinstance(inserted_data, list) and len(inserted_data) > 0:
            test_id = inserted_data[0]['id']
            
            # Test cleanup - delete the test record
            print("🧹 Cleaning up test record...")
            delete_response = requests.delete(
                f'{supabase_url}/rest/v1/audio_cache?id=eq.{test_id}',
                headers=headers
            )
            
            if delete_response.status_code == 204:
                print("✅ Test cleanup successful")
            else:
                print(f"⚠️  Test cleanup failed: {delete_response.status_code}")
        
        return True
    else:
        print(f"❌ Test insert failed: HTTP {response.status_code}")
        print(f"Response: {response.text}")
        return False

def main():
    print("🎵 Aristo Audio Cache Setup")
    print("=" * 30)
    
    # Check environment
    if not os.path.exists('.env'):
        print("❌ Error: .env file not found")
        print("Please create a .env file with SUPABASE_URL and SUPABASE_ANON_KEY")
        return
    
    # Create table
    table_exists = create_audio_cache_table()
    
    if table_exists:
        # Test functionality
        print("\n🧪 Testing audio cache functionality...")
        if test_audio_cache():
            print("\n✅ Audio cache setup completed successfully!")
            print("\nYour audiobook features will now cache generated audio in Supabase.")
        else:
            print("\n❌ Audio cache test failed. Please check your Supabase configuration.")
    else:
        print("\n📋 Please create the audio_cache table manually using the SQL provided above.")

if __name__ == '__main__':
    main()
