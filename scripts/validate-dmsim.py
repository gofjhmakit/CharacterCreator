"""Validate DM Simulator exports against dnd_project's real Character model.

Usage (from CharacterEditor):
  DMSIM_OUT=$PWD/tests/.dmsim-out npx vitest run tests/dmsim-export.test.ts
  uv run --project ../dnd_project python scripts/validate-dmsim.py tests/.dmsim-out [more.json ...]
"""
import json
import sys
from pathlib import Path

from dnd_shared.character import Character
from dnd_shared import rules

paths = [p for a in sys.argv[1:] for p in (sorted(Path(a).glob("*.json")) if Path(a).is_dir() else [Path(a)])]
bad = 0
for p in paths:
    size = p.stat().st_size
    try:
        c = Character.model_validate(json.loads(p.read_text()))
    except Exception as exc:  # noqa: BLE001
        bad += 1
        print(f"FAIL {p.name}: {exc}")
        continue
    atk = ", ".join(f"{a.name} {rules.signed(rules.total(rules.attack_modifiers(c, a)))} {a.damage}" for a in c.attacks)
    print(f"ok   {p.name} ({size} B): {c.summary}; AC {c.ac}, HP {c.hp.max}, spells {len(c.spellcasting.spells)}, "
          f"features {len(c.features)}; attacks: {atk}")
    if size > 60_000:
        bad += 1
        print("     too large for the player app's /import (60 KB)")
sys.exit(1 if bad else 0)
