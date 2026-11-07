# الصبح الأسود

لعبة خيانة في الديرة، من 4 إلى 12 لاعب. كل واحد يلعب من جواله: واحد يسوي غرفة ويعطي الباقين الرمز، أو تلعب مع البوتات.

العب هنا: **https://not-sal.com/alsobh/** (على Cloudflare، الغرف على سيرفرنا)

- نسخة احتياطية على GitHub Pages (الغرف عبر سيرفرات MQTT عامة): https://not-sal.github.io/alsobh-alaswad/

## Cloudflare

`wrangler.jsonc` يشغّل Worker واحد:
- يعرض اللعبة من مجلد `site/alsobh/`
- يفتح غرفة لكل رمز على `/alsobh/ws/<الرمز>` (Durable Object لكل غرفة، WebSocket لكل جوال)

النشر: الريبو مربوط بـ Workers Builds في Cloudflare، وأي push على `main` ينشر لحاله على not-sal.com/alsobh.
