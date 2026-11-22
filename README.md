# YFE Craft

Воксельная игра со своим WebGL-движком (один файл `game/index.html`): энергия, ME-хранилище, магия аспектов (узлы ауры, руническая матрица, жезлы), кузница, конвейеры, мультиплеер до 5–8 друзей.

**Разработчик: @yfeeeee**

## Структура
- `game/index.html` — вся игра (исходник).
- `server/` — Node-сервер мультиплеера без зависимостей (раздаёт игру и WebSocket). Деплой на Railway.
- `mobile/` — Capacitor-проект для Android APK (сборка через GitHub Actions).
- `tools/sync.sh` — после правки `game/index.html` запусти, чтобы обновить копии в `server/public` и `mobile/www`.

## Играть одному
Открой `game/index.html` в браузере (на телефоне — через любой браузер).

## Сервер на Railway
1. New Project → Deploy from GitHub repo → выбери этот репозиторий.
2. Settings → **Root Directory = `server`**.
3. Settings → Networking → Generate Domain. Проверка: `https://домен/health`.
4. (Желательно) добавь Volume, смонтируй в `/data`, переменная `DATA_DIR=/data` — мир сохраняется между перезапусками.
5. Друзья открывают домен в браузере и выбирают «Мультиплеер».

## Android APK
Actions → «Build Android APK» → Run workflow → скачай артефакт `YFE-Craft-debug-apk`.

## Управление и справка
Внутри игры: меню → «Справка».
