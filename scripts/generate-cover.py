import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 2400
HEIGHT = 1350

# 1. Base Canvas
base = Image.new("RGBA", (WIDTH, HEIGHT), (248, 249, 251, 255))

# Ambient radiant glow
glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([(-180, -180), (1050, 950)], fill=(255, 226, 212, 170))
gdraw.ellipse([(1100, 50), (2550, 1450)], fill=(215, 238, 255, 185))
gdraw.ellipse([(-100, 750), (950, 1650)], fill=(228, 248, 240, 140))
glow = glow.filter(ImageFilter.GaussianBlur(150))
base = Image.alpha_composite(base, glow)

# 2. Fonts
font_dir = "/System/Library/Fonts/Supplemental"
font_title = ImageFont.truetype(f"{font_dir}/Arial Bold.ttf", 68)
font_subtitle = ImageFont.truetype(f"{font_dir}/Arial.ttf", 31)
font_badge = ImageFont.truetype(f"{font_dir}/Arial Bold.ttf", 22)
font_pill = ImageFont.truetype(f"{font_dir}/Arial Bold.ttf", 24)
font_url = ImageFont.truetype(f"{font_dir}/Arial Bold.ttf", 26)
font_card_tag = ImageFont.truetype(f"{font_dir}/Arial Bold.ttf", 20)

draw = ImageDraw.Draw(base)

# 3. Logo
logo_path = "public/brand/mitrai-logo-dark.png"
if os.path.exists(logo_path):
    logo = Image.open(logo_path).convert("RGBA")
    logo_w = int(logo.width * (108 / logo.height))
    logo = logo.resize((logo_w, 108), Image.Resampling.LANCZOS)
    base.paste(logo, (120, 110), logo)

draw = ImageDraw.Draw(base)

# 4. Top Event Badge
event_box = [(600, 142), (940, 186)]
draw.rounded_rectangle(event_box, radius=22, fill=(255, 255, 255, 230), outline=(210, 222, 236, 255), width=2)
draw.text((625, 153), "ETHGlobal Mumbai 2026", font=font_badge, fill=(30, 58, 95, 255))

# 5. Tagline & Narrative Headings
draw.text((120, 265), "A little life,\na world of possibility.", font=font_title, fill=(15, 23, 42, 255), spacing=18)

sub_text = (
    "The world’s first mortal AI companion with an evolving symbolic mind,\n"
    "sovereign on-chain custody on Arkiv, and confidential 0G intelligence."
)
draw.text((120, 450), sub_text, font=font_subtitle, fill=(71, 85, 105, 255), spacing=12)

# 6. Technology Pills
pills = [
    ("0G Private Computer", (238, 242, 255), (199, 210, 254), (67, 56, 202)),
    ("Arkiv DB-Chain (Rabdi)", (236, 253, 245), (167, 243, 208), (6, 95, 70)),
    ("Sarvam AI Bulbul Voice", (255, 247, 237), (254, 215, 170), (154, 52, 18)),
]

cur_x = 120
pill_y = 590
for name, bg_c, border_c, text_c in pills:
    bbox1 = draw.textbbox((0, 0), name, font=font_pill)
    pw = (bbox1[2] - bbox1[0]) + 40
    ph = 56
    draw.rounded_rectangle([(cur_x, pill_y), (cur_x + pw, pill_y + ph)], radius=16, fill=bg_c, outline=border_c, width=2)
    draw.text((cur_x + 20, pill_y + 16), name, font=font_pill, fill=text_c)
    cur_x += pw + 18

# Key Pillars / Bullets
bullets = [
    "Finite mortal lifespan (30-180 days) matching Arkiv native storage leases",
    "Dynamic memory crystals formed autonomously through conversation",
    "1-click on-chain custody handover & permanent Sunset Legacy monuments",
]
by = 695
for b in bullets:
    draw.ellipse([(120, by + 10), (132, by + 22)], fill=(37, 99, 235, 255))
    draw.text((146, by), b, font=font_subtitle, fill=(51, 65, 85, 255))
    by += 52

# Live URL Badge
url_box = [(120, 900), (590, 968)]
draw.rounded_rectangle(url_box, radius=24, fill=(15, 23, 42, 255))
draw.text((150, 920), "Live Demo: eth-mitrai.netlify.app", font=font_url, fill=(255, 255, 255, 255))


# 7. High-Res Mockup Cards
def create_mockup_card(img_path, width, height, corner_radius=22, crop_browser_bar=True):
    if not os.path.exists(img_path):
        return None
    raw = Image.open(img_path).convert("RGBA")
    
    # If it has a macOS chrome browser top bar, crop it out for a super clean app card
    if crop_browser_bar and raw.height > 600:
        raw = raw.crop((0, int(raw.height * 0.12), raw.width, raw.height))
    
    aspect = width / height
    raw_aspect = raw.width / raw.height
    if raw_aspect > aspect:
        new_w = int(raw.height * aspect)
        left = (raw.width - new_w) // 2
        raw = raw.crop((left, 0, left + new_w, raw.height))
    else:
        new_h = int(raw.width / aspect)
        top = (raw.height - new_h) // 2
        raw = raw.crop((0, top, raw.width, top + new_h))
        
    resized = raw.resize((width, height), Image.Resampling.LANCZOS)
    
    mask = Image.new("L", (width, height), 0)
    m舖 = ImageDraw.Draw(mask)
    m舖.rounded_rectangle([(0, 0), (width, height)], radius=corner_radius, fill=255)
    
    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card.paste(resized, (0, 0), mask)
    
    b_draw = ImageDraw.Draw(card)
    b_draw.rounded_rectangle([(0, 0), (width - 1, height - 1)], radius=corner_radius, outline=(226, 232, 240, 255), width=2)
    return card

def paste_with_shadow(target, card, x, y, shadow_blur=44, shadow_offset=28, shadow_alpha=75):
    w, h = card.size
    shadow = Image.new("RGBA", (w + shadow_blur * 2, h + shadow_blur * 2), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle(
        [(shadow_blur, shadow_blur + shadow_offset), (w + shadow_blur, h + shadow_blur + shadow_offset)],
        radius=22,
        fill=(15, 23, 42, shadow_alpha)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur // 2))
    target.paste(shadow, (x - shadow_blur, y - shadow_blur), shadow)
    target.paste(card, (x, y), card)

# Card 1: Clean Carrot Kid with Symbolic Mind Map
carrot_img = "/Users/nishantmaurya/.gemini/antigravity/brain/0f09f758-3550-40ab-8607-c5301a461c1d/.user_uploaded/media_1794002575007_4f67b82b.jpg"
card1 = create_mockup_card(carrot_img, 1020, 680, crop_browser_bar=True)

# Card 2: Clean Nightmare Chat with 0G Confidential Inference
nightmare_img = "/Users/nishantmaurya/.gemini/antigravity/brain/0f09f758-3550-40ab-8607-c5301a461c1d/.user_uploaded/media_1794011986034_67979f1a.jpg"
card2 = create_mockup_card(nightmare_img, 920, 620, crop_browser_bar=True)

# Paste Card 2 behind and to the bottom right
if card2:
    paste_with_shadow(base, card2, 1360, 570, shadow_blur=50, shadow_offset=28, shadow_alpha=65)

# Paste Card 1 in front and top right
if card1:
    paste_with_shadow(base, card1, 1240, 140, shadow_blur=60, shadow_offset=34, shadow_alpha=85)

# Floating Badge: "Arkiv Rabdi Testnet Verified"
tag_w, tag_h = 320, 48
tag_img = Image.new("RGBA", (tag_w, tag_h), (0, 0, 0, 0))
t_draw = ImageDraw.Draw(tag_img)
t_draw.rounded_rectangle([(0, 0), (tag_w - 1, tag_h - 1)], radius=14, fill=(15, 23, 42, 235), outline=(51, 65, 85, 255), width=1)
t_draw.text((22, 14), "Arkiv Rabdi Entity #299338", font=font_card_tag, fill=(241, 245, 249, 255))
base.paste(tag_img, (1275, 175), tag_img)

# Save master images
os.makedirs("public/cover", exist_ok=True)
base.save("public/cover/mitrai-cover.png", "PNG")
rgb_base = base.convert("RGB")
rgb_base.save("public/cover/mitrai-cover.jpg", "JPEG", quality=96)

# Copy to conversation artifact directory for preview
art_dir = "/Users/nishantmaurya/.gemini/antigravity/brain/0f09f758-3550-40ab-8607-c5301a461c1d"
rgb_base.save(f"{art_dir}/mitrai-cover.jpg", "JPEG", quality=96)
print("✅ Master cover updated with spotless clean cards: public/cover/mitrai-cover.png")
