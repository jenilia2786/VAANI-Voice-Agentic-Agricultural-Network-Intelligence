import httpx
import asyncio

async def test_tts():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://localhost:8000/api/audio/tts", json={"text": "வணக்கம், நான் வாணி."})
            print(f"Status: {resp.status_code}")
            print(f"Content length: {len(resp.content)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_tts())
