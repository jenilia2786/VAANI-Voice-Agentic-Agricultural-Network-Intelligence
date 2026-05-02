
import os
import groq
from dotenv import load_dotenv

load_dotenv()

def test_groq():
    api_key = os.getenv("GROQ_API_KEY", "")
    print(f"API Key found: {bool(api_key)}")
    if not api_key:
        return
    
    try:
        client = groq.Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "user", "content": "Hello, are you working?"}
            ],
            model="llama-3.1-8b-instant",
        )
        print("Response:", chat_completion.choices[0].message.content)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_groq()
