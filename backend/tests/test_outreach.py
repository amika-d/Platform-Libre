import asyncio
from src.queue.producer import push_linkedin_task

async def main():
    # ⚠️ CHANGE THIS URL to your second LinkedIn account!
    test_payload = {
        "campaign_id": "hackathon-test-001",
        "target_url": "https://www.linkedin.com/in/isula-jayagoda-813047254", 
        "message_text": "Hey! Just testing my AI agent build for the Veracity hackathon. Let's connect!"
    }
    
    print("🚀 Pushing test task to Redis...")
    
    # "send_linkedin_invite" MUST match the function name in worker_main.py
    await push_linkedin_task("send_linkedin_invite", test_payload)
    
    print("✅ Task queued! Watch your worker terminal.")

if __name__ == "__main__":
    asyncio.run(main())