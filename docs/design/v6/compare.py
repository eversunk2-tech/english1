# 지금 vs v6 시안 나란히(Plan 2026-11-27). 사용: python3 docs/design/v6/compare.py
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__))
FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
f = ImageFont.truetype(FONT, 30, index=6) if os.path.exists(FONT) else ImageFont.load_default()
for orient in ['land', 'port']:
    for n in ['start', 'start-vh', 'handcheck', 'countdown', 'play', 'play-wrong', 'play-correct', 'play-miss', 'paused', 'result', 'error']:
        a = os.path.join(D, 'now', f'now-{n}-{orient}.png'); b = os.path.join(D, 'new', f'new-{n}-{orient}.png')
        if not (os.path.exists(a) and os.path.exists(b)): continue
        A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
        W, H = A.size; gap, top = 24, 56
        out = Image.new('RGB', (W * 2 + gap, H + top), '#141414')
        out.paste(A, (0, top)); out.paste(B, (W + gap, top))
        d = ImageDraw.Draw(out)
        d.text((16, 10), f'지금 (배포본) — {n} {"가로 1180×820" if orient=="land" else "세로 820×1180"}', font=f, fill='#fffdf7')
        d.text((W + gap + 16, 10), 'v6 시안 — 볼드 레트로 "포스터 스티커"', font=f, fill='#ffd400')
        out.save(os.path.join(D, 'compare', f'compare-{n}-{orient}.png'), optimize=True)
print('ok')
