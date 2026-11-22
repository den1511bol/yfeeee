# YFE Craft — сервер (Railway)
Разработчик: @yfeeeee

Без зависимостей: `node server.js`. До 8 игроков (рассчитано на 5 друзей). Игра лежит в `public/index.html`.

## Деплой на Railway
1. Залей содержимое этой папки в репозиторий GitHub (может быть приватным).
2. Railway → New Project → Deploy from GitHub repo → выбери репозиторий.
3. Settings → Networking → Generate Domain (получишь адрес вида `xxx.up.railway.app`).
4. Чтобы мир не сбрасывался при передеплое: Settings → Volumes → New Volume, mount path `/data`,
   затем Variables → `DATA_DIR=/data`.
5. Друзья открывают адрес в браузере телефона и жмут «Мультиплеер». В приложении Android
   адрес вводится в поле «Адрес сервера».

`/health` отвечает `ok` — Railway использует его для проверки. Мир, сундуки и механизмы
сохраняются в `world.json`, энергия считается на сервере.
