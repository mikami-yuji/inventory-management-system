import os
from supabase import create_client, Client

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

print("--- users in public.users ---")
try:
    response = supabase.table("users").select("*").execute()
    print(response.data)
except Exception as e:
    print(f"Error fetching public.users: {e}")

print("--- trying to sign in ---")
try:
    response = supabase.auth.signInWithPassword({
        "email": "mikami@asahipac.co.jp",
        "password": "REPLACE_ME_LATER" # I don't have the password, but I can check if the user exists
    })
    print(response.user)
except Exception as e:
    print(f"Error signing in: {e}")

