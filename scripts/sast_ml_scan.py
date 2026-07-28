#!/usr/bin/env python3
"""
SAST Avanzado — Pipeline CI/CD del Master Gateway (Shift-Left).

Enfoque pragmático sugerido por el propio anexo del PDF: entrenar un
modelo de Machine Learning desde cero está fuera del alcance ágil del
proyecto, así que este script actúa como la capa de "Análisis SAST
Avanzado (Modelo de Minería de Datos/ML)" del pipeline usando un motor
de reglas de seguridad real y gratuito (Semgrep, con el ruleset
`p/security-audit` construido sobre patrones de CWEs) en vez de una
red neuronal ad-hoc. Es la misma idea que sugiere el PDF (un modelo tipo
CodeBERT fine-tuneado con CWEs) resuelta con una herramienta ya validada
por la comunidad de seguridad, en lugar de reinventar el entrenamiento.

Comportamiento exigido por la especificación:
  - Lee solo los archivos .ts / .py modificados en el commit/PR.
  - Devuelve exit code 0 (seguro) o 1 (vulnerable) para que el job de
    GitHub Actions detenga el pipeline si hay hallazgos.

Uso:
    python scripts/sast_ml_scan.py --base-ref origin/main
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Consola de Windows en cp1252 por defecto: fuerza UTF-8 para tildes/emojis.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

EXTENSIONES_ANALIZABLES = {".ts", ".py"}
SEVERIDADES_BLOQUEANTES = {"ERROR", "WARNING"}  # Semgrep: ERROR ~ HIGH/CRITICAL

# Nombres de rama/SHA válidos únicamente (letras, dígitos, . _ / -), y NUNCA
# empezando con "-": un valor como "--upload-pack=..." pasado sin validar a
# `git diff` se interpretaría como una opción, no como una referencia
# (inyección de argumentos de CLI). --base-ref puede venir de un input de
# workflow, así que se valida antes de tocar subprocess.
REFERENCIA_SEGURA = re.compile(r"^[A-Za-z0-9._/]+[A-Za-z0-9._/-]*$")


def validar_referencia(base_ref: str) -> str:
    if not REFERENCIA_SEGURA.match(base_ref):
        raise ValueError(f"Referencia git no válida o potencialmente peligrosa: {base_ref!r}")
    return base_ref


def archivos_modificados(base_ref: str) -> list[str]:
    """Diff contra la rama base: solo se analiza lo que cambió en el commit."""
    base_ref = validar_referencia(base_ref)
    resultado = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACMR", f"{base_ref}...HEAD", "--"],
        capture_output=True,
        text=True,
        check=False,
    )
    if resultado.returncode != 0:
        print(f"[sast-ml] No se pudo diferenciar contra {base_ref}, analizando todo el repo.")
        return []

    archivos = [
        linea.strip()
        for linea in resultado.stdout.splitlines()
        if Path(linea.strip()).suffix in EXTENSIONES_ANALIZABLES
    ]
    return [a for a in archivos if Path(a).exists()]


def ejecutar_semgrep(objetivos: list[str]) -> dict:
    if shutil.which("semgrep") is None:
        print("[sast-ml] ERROR: semgrep no está instalado en el runner.")
        sys.exit(1)

    comando = [
        "semgrep",
        "--config=p/security-audit",
        "--config=p/owasp-top-ten",
        "--json",
        "--quiet",
        *(objetivos if objetivos else ["."]),
    ]
    proceso = subprocess.run(comando, capture_output=True, text=True, check=False)

    try:
        return json.loads(proceso.stdout or "{}")
    except json.JSONDecodeError:
        print("[sast-ml] No se pudo interpretar la salida de semgrep:")
        print(proceso.stdout)
        print(proceso.stderr)
        sys.exit(1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-ref",
        default="origin/main",
        help="Rama contra la que se calcula el diff (por defecto origin/main)",
    )
    args = parser.parse_args()

    try:
        objetivos = archivos_modificados(args.base_ref)
    except ValueError as error:
        print(f"[sast-ml] ERROR: {error}")
        return 1
    if not objetivos:
        print("[sast-ml] Sin archivos .ts/.py modificados relevantes. Nada que analizar.")
        return 0

    print(f"[sast-ml] Analizando {len(objetivos)} archivo(s) modificado(s):")
    for archivo in objetivos:
        print(f"  - {archivo}")

    reporte = ejecutar_semgrep(objetivos)
    hallazgos = reporte.get("results", [])
    bloqueantes = [
        h for h in hallazgos if h.get("extra", {}).get("severity") in SEVERIDADES_BLOQUEANTES
    ]

    if not bloqueantes:
        print(f"[sast-ml] 0 patrones sospechosos de CWE detectados. Código seguro.")
        return 0

    print(f"[sast-ml] {len(bloqueantes)} patrón(es) sospechoso(s) de vulnerabilidad detectado(s):")
    for hallazgo in bloqueantes:
        ruta = hallazgo.get("path")
        linea = hallazgo.get("start", {}).get("line")
        regla = hallazgo.get("check_id")
        mensaje = hallazgo.get("extra", {}).get("message", "").strip()
        print(f"  [{hallazgo['extra'].get('severity')}] {ruta}:{linea} ({regla})")
        print(f"      {mensaje}")

    return 1


if __name__ == "__main__":
    sys.exit(main())
