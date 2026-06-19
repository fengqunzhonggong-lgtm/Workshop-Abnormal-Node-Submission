from datetime import datetime, date
from database import get_db


def generate_record_no():
    db = get_db()
    today = date.today()
    prefix = today.strftime('%Y%m%d')
    row = db.execute(
        "SELECT record_no FROM abnormal_records WHERE record_no LIKE ? ORDER BY record_no DESC LIMIT 1",
        (prefix + '%',)
    ).fetchone()
    seq = int(row['record_no'][-4:]) + 1 if row else 1
    db.close()
    return prefix + str(seq).zfill(4)


def get_week_label(d=None):
    d = d or datetime.now()
    week_num = d.isocalendar()[1]
    return f"{d.year}-W{str(week_num).zfill(2)}"


def get_month_label(d=None):
    d = d or datetime.now()
    return d.strftime('%Y-%m')


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]
