#!/bin/sh
# Копирует game/index.html в сервер и мобильное приложение. Разработчик: @yfeeeee
cd "$(dirname "$0")/.." && cp game/index.html server/public/index.html && cp game/index.html mobile/www/index.html && echo "ok"
