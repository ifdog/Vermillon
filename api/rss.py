import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from flask import Blueprint, Response, request
from db import get_db

bp = Blueprint('rss', __name__)


def _get_site_title():
    db = get_db()
    row = db.execute('SELECT value FROM site_settings WHERE key = ?', ('site_title',)).fetchone()
    return row['value'] if row else 'Vermillon'


def _strip_html(text):
    import re
    text = re.sub(r'<[^>]+>', '', text)
    return text


@bp.route('/feed.xml', methods=['GET'])
def atom_feed():
    db = get_db()
    site_title = _get_site_title()
    base_url = request.url_root.rstrip('/')

    rows = db.execute(
        'SELECT * FROM memos WHERE published = 1 ORDER BY created_at DESC LIMIT 20'
    ).fetchall()

    ns = {
        'atom': 'http://www.w3.org/2005/Atom'
    }

    feed = ET.Element('{%s}feed' % ns['atom'])
    ET.SubElement(feed, '{%s}title' % ns['atom']).text = site_title
    ET.SubElement(feed, '{%s}link' % ns['atom']).set('href', f'{base_url}/feed.xml')
    ET.SubElement(feed, '{%s}link' % ns['atom']).set('rel', 'self')
    ET.SubElement(feed, '{%s}updated' % ns['atom']).text = datetime.now(timezone.utc).isoformat()
    ET.SubElement(feed, '{%s}id' % ns['atom']).text = base_url + '/'

    author = ET.SubElement(feed, '{%s}author' % ns['atom'])
    ET.SubElement(author, '{%s}name' % ns['atom']).text = 'admin'

    for row in rows:
        entry = ET.SubElement(feed, '{%s}entry' % ns['atom'])
        ET.SubElement(entry, '{%s}title' % ns['atom']).text = row['title'] or '(无标题)'
        slug = row['slug'] or str(row['id'])
        ET.SubElement(entry, '{%s}link' % ns['atom']).set('href', f'{base_url}/memo/{slug}')
        ET.SubElement(entry, '{%s}id' % ns['atom']).text = f'{base_url}/memo/{slug}'
        updated = row['updated_at'] or row['created_at']
        ET.SubElement(entry, '{%s}updated' % ns['atom']).text = updated
        ET.SubElement(entry, '{%s}published' % ns['atom']).text = row['created_at']
        content_text = _strip_html(row['content'])[:300]
        ET.SubElement(entry, '{%s}summary' % ns['atom']).text = content_text
        content_elem = ET.SubElement(entry, '{%s}content' % ns['atom'])
        content_elem.set('type', 'html')
        content_elem.text = row['content']

    xml_str = ET.tostring(feed, encoding='unicode')
    return Response(xml_str, mimetype='application/atom+xml')


@bp.route('/sitemap.xml', methods=['GET'])
def sitemap():
    db = get_db()
    base_url = request.url_root.rstrip('/')

    rows = db.execute(
        'SELECT id, slug, updated_at, created_at FROM memos WHERE published = 1 ORDER BY created_at DESC'
    ).fetchall()

    ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    urlset = ET.Element('{%s}urlset' % ns)

    # Homepage
    url_elem = ET.SubElement(urlset, '{%s}url' % ns)
    ET.SubElement(url_elem, '{%s}loc' % ns).text = base_url + '/'
    ET.SubElement(url_elem, '{%s}changefreq' % ns).text = 'daily'
    ET.SubElement(url_elem, '{%s}priority' % ns).text = '1.0'

    for row in rows:
        slug = row['slug'] or str(row['id'])
        url_elem = ET.SubElement(urlset, '{%s}url' % ns)
        ET.SubElement(url_elem, '{%s}loc' % ns).text = f'{base_url}/memo/{slug}'
        lastmod = row['updated_at'] or row['created_at']
        if lastmod:
            ET.SubElement(url_elem, '{%s}lastmod' % ns).text = lastmod[:10]
        ET.SubElement(url_elem, '{%s}changefreq' % ns).text = 'weekly'
        ET.SubElement(url_elem, '{%s}priority' % ns).text = '0.8'

    xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_str += ET.tostring(urlset, encoding='unicode')
    return Response(xml_str, mimetype='application/xml')
