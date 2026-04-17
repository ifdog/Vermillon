import calendar
from datetime import datetime
from flask import Blueprint, jsonify
from db import get_db

bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')

@bp.route('/<int:year>/<int:month>', methods=['GET'])
def get_calendar(year, month):
    db = get_db()
    start_date = f'{year:04d}-{month:02d}-01'
    if month == 12:
        next_month = f'{year+1:04d}-01-01'
    else:
        next_month = f'{year:04d}-{month+1:02d}-01'
    
    rows = db.execute('''
        SELECT m.id, DATE(m.created_at) as day, m.title, m.word_count
        FROM memos m
        WHERE m.created_at >= ? AND m.created_at < ? AND m.published = 1
        ORDER BY m.created_at DESC
    ''', (start_date, next_month)).fetchall()
    
    days = {}
    for r in rows:
        day = r['day']
        if day not in days:
            days[day] = {
                'date': day,
                'count': 1,
                'memos': []
            }
        else:
            days[day]['count'] += 1
        
        # fetch tags for this memo
        tags = db.execute('''
            SELECT t.name FROM tags t
            JOIN memo_tags mt ON t.id = mt.tag_id
            WHERE mt.memo_id = ?
        ''', (r['id'],)).fetchall()
        
        days[day]['memos'].append({
            'id': r['id'],
            'title': r['title'] or '(无标题)',
            'word_count': r['word_count'] or 0,
            'tags': [t['name'] for t in tags]
        })
    
    cal = calendar.Calendar()
    weeks = []
    for week in cal.monthdayscalendar(year, month):
        weeks.append(week)
    
    return jsonify({
        'year': year,
        'month': month,
        'days': list(days.values()),
        'weeks': weeks
    })
