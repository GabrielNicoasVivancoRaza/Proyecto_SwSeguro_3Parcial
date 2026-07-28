#!/usr/bin/env python3
"""
Notificador de Telegram para el pipeline CI/CD (Anexo del PDF).

Envía un mensaje al grupo de Telegram del equipo usando la API del bot
creado con @BotFather. Los credenciales SIEMPRE llegan por variables de
entorno (Secrets de GitHub Actions) — nunca hardcodeados en el código
fuente, cumpliendo el requisito de Gestión Segura de Secrets.

Uso:
    python scripts/notify_telegram.py "<mensaje en Markdown>"

Variables de entorno requeridas:
    TELEGRAM_BOT_TOKEN  — token entregado por BotFather
    TELEGRAM_CHAT_ID    — id del grupo/canal del equipo
"""

from __future__ import annotations

import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Formato real de un token de bot de BotFather: "<id numérico>:<hash>".
# Validarlo antes de interpolarlo en la URL evita que un valor inesperado
# (p. ej. con "/" o espacios) altere la ruta de la petición a la API.
FORMATO_TOKEN_TELEGRAM = re.compile(r"^\d+:[A-Za-z0-9_-]+$")


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: notify_telegram.py \"<mensaje>\"", file=sys.stderr)
        return 1

    mensaje = sys.argv[1]
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        # No se rompe el pipeline por esto: la notificación es informativa,
        # no debe bloquear un build/deploy que sí pasó los gates de seguridad.
        print(
            "[telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados; "
            "se omite la notificación.",
        )
        return 0

    if not FORMATO_TOKEN_TELEGRAM.match(token):
        print("[telegram] TELEGRAM_BOT_TOKEN tiene un formato inesperado; se omite la notificación.")
        return 0

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    datos = urllib.parse.urlencode(
        {
            "chat_id": chat_id,
            "text": mensaje,
            "parse_mode": "Markdown",
            "disable_web_page_preview": "true",
        },
    ).encode()

    try:
        # El esquema ("https://") y el host ("api.telegram.org") son literales
        # fijos en el código; la única parte dinámica es el token, ya validado
        # arriba contra FORMATO_TOKEN_TELEGRAM (sin "/" ni caracteres que
        # puedan alterar la ruta). No hay forma de que esta URL apunte a
        # file:// ni a un host distinto — la regla de abajo es puramente
        # sintáctica y no distingue esto.
        with urllib.request.urlopen(  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
            urllib.request.Request(url, data=datos, method="POST"),
            timeout=10,
        ) as respuesta:
            if respuesta.status == 200:
                print("[telegram] Notificación enviada.")
                return 0
            print(f"[telegram] Respuesta inesperada: HTTP {respuesta.status}")
            return 0
    except urllib.error.URLError as error:
        print(f"[telegram] No se pudo enviar la notificación: {error}")
        return 0  # informativo: no bloquea el pipeline


if __name__ == "__main__":
    sys.exit(main())
