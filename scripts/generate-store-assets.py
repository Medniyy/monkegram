from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-submission"
SRC = OUT / "source-captures"
MOBILE = ROOT.parent / "monkegram-mobile"
CANVAS_FONTS = Path.home() / ".agents" / "skills" / "canvas-design" / "canvas-fonts"

W, H = 1080, 1920
BG = "#071b10"
PANEL = "#0c2a18"
PANEL_2 = "#103a22"
GOLD = "#fec133"
GOLD_2 = "#d99d20"
CREAM = "#f0ead6"
DIM = "#9fb39a"
RED = "#c8392f"
BLACK = "#020806"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


HEAD = CANVAS_FONTS / "BigShoulders-Bold.ttf"
LABEL = CANVAS_FONTS / "DMMono-Regular.ttf"
LABEL_BOLD = CANVAS_FONTS / "GeistMono-Bold.ttf"
PIXEL = ROOT / "app" / "fonts" / "PressStart2P-Regular.ttf"


def add_texture(image: Image.Image, seed: int = 7) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    random.seed(seed)
    for _ in range(2200):
        x = random.randrange(image.width)
        y = random.randrange(image.height)
        a = random.randrange(2, 13)
        color = (254, 193, 51, a) if random.random() < 0.24 else (240, 234, 214, a)
        draw.point((x, y), fill=color)
    for y in range(0, image.height, 5):
        draw.line((0, y, image.width, y), fill=(0, 0, 0, 18), width=1)


def base_canvas(seed: int) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, W, H), fill=(7, 27, 16, 255))
    draw.ellipse((-200, -120, 820, 900), fill=(254, 193, 51, 13))
    draw.ellipse((420, 1000, 1320, 2040), fill=(40, 140, 79, 12))
    for x in range(64, W, 96):
        draw.line((x, 0, x, H), fill=(254, 193, 51, 10), width=1)
    add_texture(img, seed)
    return img


def text_center(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    spacing: int = 4,
) -> None:
    draw.multiline_text(xy, text, font=fnt, fill=fill, anchor="ma", align="center", spacing=spacing)


def header(img: Image.Image, title: str, index: str, sub: str) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((72, 66), "MONKEGRAM // SEEKER", font=font(LABEL_BOLD, 24), fill=GOLD)
    draw.text((1008, 66), index, font=font(LABEL, 22), fill=DIM, anchor="ra")
    draw.line((72, 112, 1008, 112), fill=(254, 193, 51, 92), width=2)
    multiline = "\n" in title
    text_center(
        draw,
        (540, 176 if multiline else 205),
        title,
        font(HEAD, 86 if multiline else 100),
        CREAM,
        spacing=-12,
    )
    text_center(draw, (540, 350 if multiline else 330), sub, font(LABEL, 26), DIM)


def device_frame(img: Image.Image, screenshot: Image.Image, top: int = 410) -> tuple[int, int, int, int]:
    device_h = 1408
    device_w = round(device_h * screenshot.width / screenshot.height)
    x = (W - device_w) // 2
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((x + 26, top + 28, x + device_w + 26, top + device_h + 28), fill=(0, 0, 0, 105))
    draw.rectangle((x - 10, top - 10, x + device_w + 10, top + device_h + 10), fill=GOLD)
    draw.rectangle((x - 5, top - 5, x + device_w + 5, top + device_h + 5), fill=BLACK)
    shot = screenshot.resize((device_w, device_h), Image.Resampling.LANCZOS)
    img.paste(shot, (x, top))
    return x, top, device_w, device_h


def corner_marks(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color=GOLD) -> None:
    x, y, w, h = box
    length = 46
    width = 4
    for sx, sy, dx, dy in [
        (x, y, 1, 1),
        (x + w, y, -1, 1),
        (x, y + h, 1, -1),
        (x + w, y + h, -1, -1),
    ]:
        draw.line((sx, sy, sx + dx * length, sy), fill=color, width=width)
        draw.line((sx, sy, sx, sy + dy * length), fill=color, width=width)


def remove_flat_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    px = rgba.load()
    bg = px[0, 0][:3]
    out = Image.new("RGBA", rgba.size)
    opx = out.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            distance = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
            alpha = max(0, min(255, int((distance - 10) * 12)))
            opx[x, y] = (r, g, b, alpha)
    return out


def stylize_record_screen(raw: Image.Image, monke: Image.Image) -> Image.Image:
    screen = raw.convert("RGB")
    pixels = screen.load()
    for y in range(screen.height):
        for x in range(screen.width):
            r, g, b = pixels[x, y]
            if g > r * 1.35 and g > b * 1.35 and g > 75:
                depth = y / screen.height
                pixels[x, y] = (
                    int(5 + 7 * depth),
                    int(25 + 18 * depth),
                    int(17 + 9 * depth),
                )

    overlay = Image.new("RGBA", screen.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay, "RGBA")
    d.ellipse((90, 160, 342, 530), fill=(240, 234, 214, 28))
    d.ellipse((118, 210, 314, 470), fill=(2, 8, 6, 130))
    d.rectangle((105, 445, 327, 760), fill=(2, 8, 6, 105))
    d.ellipse((55, 390, 377, 850), fill=(254, 193, 51, 10))
    # Hide Chrome's local dev-issue badge from the capture; it is not part of
    # the production export or Android app.
    d.rectangle((0, 875, 162, 960), fill=(6, 32, 20, 255))

    cut = remove_flat_background(monke).resize((310, 310), Image.Resampling.NEAREST)
    shadow = cut.getchannel("A").filter(ImageFilter.GaussianBlur(14))
    gold_shadow = Image.new("RGBA", cut.size, (254, 193, 51, 0))
    gold_shadow.putalpha(shadow.point(lambda a: int(a * 0.45)))
    overlay.alpha_composite(gold_shadow, (69, 222))
    overlay.alpha_composite(cut, (61, 210))
    return Image.alpha_composite(screen.convert("RGBA"), overlay).convert("RGB")


def add_footer(draw: ImageDraw.ImageDraw, text: str) -> None:
    draw.line((72, 1852, 1008, 1852), fill=(254, 193, 51, 85), width=2)
    draw.text((72, 1880), text, font=font(LABEL, 21), fill=DIM)
    draw.text((1008, 1880), "CAMERA.ATH", font=font(LABEL_BOLD, 21), fill=GOLD, anchor="ra")


def preview_1() -> None:
    img = base_canvas(11)
    header(img, "RETURN TO\nMONKE", "01 / 04", "Connect your wallet. Enter the signal.")
    box = device_frame(img, Image.open(SRC / "welcome.png"), 420)
    draw = ImageDraw.Draw(img, "RGBA")
    corner_marks(draw, (box[0] - 34, box[1] - 34, box[2] + 68, box[3] + 68))
    add_footer(draw, "WALLET ENTRY // NO TOKEN TRANSFER")
    save(img, OUT / "preview-01.png")


def preview_2(monke: Image.Image) -> None:
    img = base_canvas(17)
    header(img, "PICK ANY SMB", "02 / 04", "Gen2 or Gen3. Type a number and wear it.")
    box = device_frame(img, Image.open(SRC / "find-result.png"), 420)
    draw = ImageDraw.Draw(img, "RGBA")
    card = (650, 1180, 970, 1575)
    draw.rectangle((card[0] + 20, card[1] + 20, card[2] + 20, card[3] + 20), fill=(0, 0, 0, 110))
    draw.rectangle(card, fill=PANEL_2, outline=GOLD, width=5)
    art = monke.resize((270, 270), Image.Resampling.NEAREST)
    img.paste(art, (675, 1210))
    draw.rectangle((675, 1500, 945, 1544), fill=GOLD)
    text_center(draw, (810, 1510), "USE THIS MONKE", font(PIXEL, 15), BLACK)
    draw.text((110, 1270), "01", font=font(HEAD, 116), fill=(254, 193, 51, 55))
    draw.text((112, 1380), "PUBLIC\nNFT ART", font=font(LABEL_BOLD, 22), fill=DIM, spacing=10)
    add_footer(draw, "10,000+ MONKES // INSTANT LOOKUP")
    save(img, OUT / "preview-02.png")


def preview_3(monke: Image.Image) -> Image.Image:
    img = base_canvas(23)
    header(img, "WEAR IT LIVE", "03 / 04", "Your monke follows your face while you record.")
    screen = stylize_record_screen(Image.open(SRC / "record.png"), monke)
    box = device_frame(img, screen, 420)
    draw = ImageDraw.Draw(img, "RGBA")
    corner_marks(draw, (box[0] - 38, box[1] - 38, box[2] + 76, box[3] + 76))
    draw.rectangle((78, 740, 245, 805), fill=PANEL, outline=GOLD, width=3)
    text_center(draw, (162, 758), "CUT BG", font(LABEL_BOLD, 20), GOLD)
    draw.rectangle((835, 905, 1002, 970), fill=PANEL, outline=GOLD, width=3)
    text_center(draw, (918, 923), "FULL HD", font(LABEL_BOLD, 18), GOLD)
    add_footer(draw, "LIVE FACE TRACKING // SOUND INCLUDED")
    save(img, OUT / "preview-03.png")
    return screen


def post_record_screen(screen: Image.Image, monke: Image.Image) -> Image.Image:
    shot = screen.convert("RGBA")
    d = ImageDraw.Draw(shot, "RGBA")
    d.rectangle((0, 590, 432, 960), fill=(7, 27, 16, 245))
    d.line((0, 590, 432, 590), fill=GOLD, width=4)
    text_center(d, (216, 624), "YOUR MONKEGRAM IS READY", font(PIXEL, 10), GOLD)
    d.rectangle((28, 666, 404, 744), fill=GOLD)
    text_center(d, (216, 687), "X  POST TO X", font(LABEL_BOLD, 25), BLACK)
    d.rectangle((28, 765, 404, 833), fill=PANEL_2, outline=CREAM, width=3)
    text_center(d, (216, 784), "SAVE TO DEVICE", font(LABEL_BOLD, 21), CREAM)
    d.text((216, 852), "Caption copied — paste and post.", font=font(LABEL, 14), fill=DIM, anchor="ma")
    d.rectangle((28, 890, 404, 940), outline=(240, 234, 214, 130), width=2)
    text_center(d, (216, 901), "RECORD AGAIN", font(LABEL_BOLD, 17), CREAM)
    return shot.convert("RGB")


def preview_4(screen: Image.Image, monke: Image.Image) -> None:
    img = base_canvas(31)
    header(img, "POST TO X\nFIRST", "04 / 04", "Share with the clip attached. Save locally too.")
    post = post_record_screen(screen, monke)
    box = device_frame(img, post, 420)
    draw = ImageDraw.Draw(img, "RGBA")
    corner_marks(draw, (box[0] - 34, box[1] - 34, box[2] + 68, box[3] + 68))
    draw.text((75, 1040), "PRIMARY", font=font(LABEL_BOLD, 21), fill=GOLD)
    draw.line((75, 1075, box[0] - 20, 1075), fill=GOLD, width=3)
    draw.text((1005, 1335), "SECONDARY", font=font(LABEL_BOLD, 18), fill=DIM, anchor="ra")
    draw.line((box[0] + box[2] + 20, 1370, 1005, 1370), fill=DIM, width=2)
    add_footer(draw, "LOCAL VIDEO // USER-CONTROLLED DELIVERY")
    save(img, OUT / "preview-04.png")


def _banner_shadow(img: Image.Image, cut: Image.Image, xy: tuple[int, int]) -> None:
    shadow = cut.getchannel("A").filter(ImageFilter.GaussianBlur(12))
    sh = Image.new("RGBA", cut.size, (0, 0, 0, 0))
    sh.putalpha(shadow.point(lambda a: int(a * 0.5)))
    img.paste(Image.new("RGBA", cut.size, (2, 8, 6, 255)), (xy[0] + 10, xy[1] + 14), sh)


def banner(monke: Image.Image, monke2: Image.Image | None = None) -> None:
    img = Image.new("RGB", (1200, 600), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, 1200, 600), fill=BG)
    for x in range(0, 1200, 48):
        draw.line((x, 0, x, 600), fill=(254, 193, 51, 12), width=1)
    for y in range(0, 600, 5):
        draw.line((0, y, 1200, y), fill=(0, 0, 0, 18), width=1)
    logo = Image.open(MOBILE / "assets" / "images" / "logo.png").convert("RGBA").resize((210, 210))
    img.paste(logo, (80, 100), logo)
    draw.text((340, 126), "MONKEGRAM", font=font(HEAD, 112), fill=CREAM)
    draw.text((344, 252), "RETURN TO MONKE", font=font(LABEL_BOLD, 31), fill=GOLD)
    draw.text((344, 315), "WEAR  •  RECORD  •  POST TO X", font=font(LABEL, 24), fill=DIM)
    if monke2 is not None:
        # Two monkes: main one set back-left, the second one front-right.
        back = remove_flat_background(monke).resize((280, 280), Image.Resampling.NEAREST)
        front = remove_flat_background(monke2).resize((312, 312), Image.Resampling.NEAREST)
        _banner_shadow(img, back, (726, 252))
        img.paste(back, (726, 252), back)
        _banner_shadow(img, front, (864, 194))
        img.paste(front, (864, 194), front)
        corner_marks(draw, (700, 168, 500, 384))
    else:
        cut = remove_flat_background(monke).resize((350, 350), Image.Resampling.NEAREST)
        img.paste(cut, (845, 180), cut)
        corner_marks(draw, (805, 92, 350, 420))
    add_texture(img, 43)
    save(img, OUT / "banner-1200x600.png")


def editor_graphic(monke: Image.Image) -> None:
    img = Image.new("RGB", (1200, 1200), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    for radius, alpha in [(840, 18), (650, 24), (470, 33)]:
        draw.ellipse(
            (600 - radius // 2, 600 - radius // 2, 600 + radius // 2, 600 + radius // 2),
            outline=(254, 193, 51, alpha),
            width=3,
        )
    cut = remove_flat_background(monke).resize((650, 650), Image.Resampling.NEAREST)
    glow = cut.getchannel("A").filter(ImageFilter.GaussianBlur(34))
    glow_img = Image.new("RGBA", cut.size, (254, 193, 51, 0))
    glow_img.putalpha(glow.point(lambda a: int(a * 0.52)))
    img.paste(glow_img, (275, 255), glow_img)
    img.paste(cut, (275, 235), cut)
    draw.text((72, 74), "MONKEGRAM", font=font(LABEL_BOLD, 30), fill=GOLD)
    draw.text((1128, 74), "MG / 001", font=font(LABEL, 24), fill=DIM, anchor="ra")
    text_center(draw, (600, 1020), "YOUR MONKE. YOUR FACE. YOUR MOMENT.", font(HEAD, 58), CREAM)
    corner_marks(draw, (90, 150, 1020, 860))
    add_texture(img, 51)
    save(img, OUT / "editors-choice-1200x1200.png")


def icon() -> None:
    source = Image.open(MOBILE / "assets" / "images" / "icon.png").convert("RGB")
    source.resize((512, 512), Image.Resampling.LANCZOS).save(
        OUT / "icon-512x512.png", optimize=True
    )


def save(image: Image.Image, path: Path) -> None:
    image.save(path, optimize=True, compress_level=9)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    import os
    monke_file = os.environ.get("MG_MONKE", "smb-12677.png")
    monke = Image.open(SRC / monke_file).convert("RGB")
    preview_1()
    preview_2(monke)
    screen = preview_3(monke)
    preview_4(screen, monke)
    # Banner features two monkes: the main one + a second (Gen3 #4076).
    second = Image.open(SRC / "smb-4076.png").convert("RGB")
    banner(monke, second)
    editor_graphic(monke)
    icon()


if __name__ == "__main__":
    main()
