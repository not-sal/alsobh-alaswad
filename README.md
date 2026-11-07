# الصبح الأسود

لعبة خيانة في الديرة، من 4 إلى 12 لاعب. كل واحد يلعب من جواله: واحد يسوي غرفة ويعطي الباقين الرمز، أو تلعب مع البوتات.

- النسخة على GitHub Pages (الغرف عبر سيرفرات MQTT عامة): https://not-sal.github.io/alsobh-alaswad/
- النسخة على Cloudflare (الغرف على سيرفرنا): ملفات `site/` و`worker/` و`wrangler.jsonc`

## Cloudflare

`wrangler.jsonc` يشغّل Worker واحد:
- يعرض اللعبة من مجلد `site/`
- يفتح غرفة لكل رمز على `/ws/<الرمز>` (Durable Object لكل غرفة، WebSocket لكل جوال)

النشر: اربط الريبو من لوحة Cloudflare (Workers & Pages ← Create ← Import a repository)، وأي push على `main` ينشر لحاله.
