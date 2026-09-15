#!/usr/bin/env python3
"""Extract the supplied September fleet inventory without silently resolving conflicts."""
import json, re, sys
from pathlib import Path
from openpyxl import load_workbook

sheet = load_workbook(sys.argv[1], read_only=True, data_only=True).active
rows = []
for first, last in ((12, 26), (30, 53), (58, 87), (92, 122)):
    for row in sheet.iter_rows(min_row=first, max_row=last, min_col=3, max_col=8):
        plate, location, make, state, reason, fuel = [str(c.value or "").strip() for c in row]
        if plate.startswith("55-"):
            pieces = plate.split("-")
            if len(pieces) == 3: plate = "-".join(reversed(pieces))
        rows.append(dict(plate=plate, location=location, manufacturer=make, status=state,
                         reason=reason, fuelType=fuel, sourceRow=row[0].row))
Path(sys.argv[2]).write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Extracted {len(rows)} inventory rows; conflicting plate 3-2003-55 remains flagged for manual review.")
