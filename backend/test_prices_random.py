
import httpx
import asyncio

async def test_prices():
    url = "http://localhost:8000/api/market/prices?crop=tomato&district=Madurai"
    for i in range(3):
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(url)
                print(f"Attempt {i+1}: {res.json()['current_price']}")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_prices())
