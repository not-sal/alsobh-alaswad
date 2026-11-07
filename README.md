# الصبح الأسود

لعبة خيانة في الديرة، من 4 إلى 12 لاعب. كل واحد يلعب من جواله: واحد يسوي غرفة ويعطي الباقين الرمز، أو تلعب مع البوتات.

العب هنا: **https://not-sal.com/alsobh/** (على Cloudflare، الغرف على سيرفرنا)

- رابط GitHub Pages القديم يحوّل لحاله على not-sal.com/alsobh

## Cloudflare

`wrangler.jsonc` يشغّل Worker واحد:
- يعرض اللعبة من مجلد `site/alsobh/`
- يشغّل اللعبة نفسها في غرفة لكل رمز على `/alsobh/ws/<الرمز>` (Durable Object): الأوراق والبوتات والوقت على السيرفر، وكل جوال يوصله اللي يخصه بس (Durable Object لكل غرفة، WebSocket لكل جوال)

النشر: الريبو مربوط بـ Workers Builds في Cloudflare، وأي push على `main` ينشر لحاله على not-sal.com/alsobh.
