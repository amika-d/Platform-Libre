
from typing import  Optional
import httpx

from src.core.config import settings


async def generate_image(
    prompt: str,
    signal_reference: str,
    size: str = "landscape_4_3",
) -> Optional[str]:
    """
    Call Fal.ai Flux.1-schnell to generate an image.
    Returns the image URL or None if generation fails.
    Always fails gracefully — never block the generator node.
    """
    if not settings.FAL_API_KEY:
        print("[image_gen] FAL_API_KEY not set — skipping image generation")
        return None
 
    # Use the prompt as-is (already crafted by LLM)
    # Minimal modifications to preserve LLM intent
    full_prompt = prompt
 
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.FAL_URL,
                headers={
                    "Authorization": f"Key {settings.FAL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": full_prompt,
                    "image_size": size,
                    "num_inference_steps": 20,
                    "num_images": 1,
                    "enable_safety_checker": True,
                },
            )
            response.raise_for_status()
            data = response.json()
            images = data.get("images", [])
            if images:
                url = images[0].get("url")
                print(f"[image_gen] Generated image for: {signal_reference[:60]}...")
                return url
    except httpx.TimeoutException:
        print("[image_gen] Timeout — skipping image, continuing without it")
    except Exception as e:
        print(f"[image_gen] Error: {e} — skipping image, continuing")
 
    return None
 
 
async def generate_flyer_image(flyer_props: dict) -> Optional[str]:
    """Generate background image for a flyer artifact."""
    image_prompt = flyer_props.get("image_prompt", "")
    signal_ref = flyer_props.get("signal_reference", "flyer")
    if not image_prompt:
        return None
    return await generate_image(image_prompt, signal_ref, size="portrait_4_3")
 
 
async def generate_social_image(post: dict) -> Optional[str]:
    """Generate image for a social post."""
    # Use the image_prompt crafted by the LLM during generation
    # This is already optimized for visual appeal
    image_prompt = post.get("image_prompt", "")
    if not image_prompt:
        # Fallback if no image_prompt provided
        image_prompt = (
            f"Professional LinkedIn post visual. "
            f"Topic: {post.get('angle', '')}. "
            f"Abstract business concept. "
            f"Minimal aesthetic."
        )
    return await generate_image(image_prompt, post.get("signal_reference", "social"), size="square_hd")
    
    
    
