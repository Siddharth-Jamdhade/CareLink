"""Date-only pregnancy arithmetic. Calendar months are clamped before adding days."""
from calendar import monthrange
from datetime import date, timedelta


def calculate_edd(lmp: date) -> date:
    month_index = lmp.year * 12 + lmp.month - 1 + 9
    year, month = divmod(month_index, 12)
    month += 1
    return date(year, month, min(lmp.day, monthrange(year, month)[1])) + timedelta(days=7)


def dating(lmp, revised=None, today=None):
    today = today or date.today()
    calculated = calculate_edd(lmp) if lmp else None
    effective = revised or calculated
    # Revised dates define a conventional 40-week gestational reference.
    elapsed = (today - (revised - timedelta(days=280) if revised else lmp)).days if effective else None
    valid = elapsed is not None and 0 <= elapsed <= 315
    return {"calculated_edd": calculated, "effective_edd": effective,
            "weeks": elapsed // 7 if valid else None, "days": elapsed % 7 if valid else None,
            "trimester": (1 if elapsed < 98 else 2 if elapsed < 196 else 3) if valid else None,
            "dating_source": "Clinician-revised EDD" if revised else "Recorded LMP (not clinician-confirmed)" if lmp else "Not recorded"}
