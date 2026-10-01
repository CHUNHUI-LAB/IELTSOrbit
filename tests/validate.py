from html.parser import HTMLParser
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
class Check(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[];self.assets=[];self.labels=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if a.get('aria-controls'):self.refs.append(a['aria-controls'])
  if a.get('aria-labelledby'):self.refs+=a['aria-labelledby'].split()
  if tag=='label':self.labels+=1
  if tag in ('script','link'):
   v=a.get('src',a.get('href',''))
   if v.startswith('./'):self.assets.append(v)
p=Check();p.feed((ROOT/'index.html').read_text())
assert len(p.ids)==len(set(p.ids)), 'duplicate ids'
assert all(x in p.ids for x in p.refs), 'broken aria references'
assert all((ROOT/x).is_file() for x in p.assets), 'missing local assets'
assert p.labels>=8
css=(ROOT/'assets/styles.css').read_text()
assert 'prefers-reduced-motion:reduce' in css
assert 'focus-visible' in css
js=(ROOT/'assets/app.js').read_text()
assert 'innerHTML' not in js
assert 'document.baseURI' in js
assert 'localStorage' in js
assert 'XMLHttpRequest' not in js
catalog=json.loads((ROOT/'data/catalog.json').read_text())
seen=set()
for r in catalog['resources']:
 assert r['id'] not in seen;seen.add(r['id'])
 for k in ('title','provider','url','summary','sourceType','skills','levels','price','access','checkedAt'):assert k in r,(r['id'],k)
 assert r['url'].startswith('https://')
 assert r['sourceType'] in ('official','teacher','experience')
 assert isinstance(r['price'],str) and r['price']
 assert isinstance(r['access'],str) and r['access']
 assert isinstance(r['skills'],list) and r['skills']
 assert isinstance(r['levels'],list) and r['levels']
 assert len(r['summary']) < 600
for section in ('policies','centers'):
 for r in catalog.get(section,[]):
  assert r.get('url',r.get('sourceUrl','')).startswith('https://'),(section,r)
  assert r.get('checkedAt'),(section,r)
assert catalog.get('calendar',{}).get('dates') == [], 'No copied or live exam dates are available'
assert catalog['metadata']['dailyUpdatesEnabled'] is True
assert catalog['metadata']['firstScheduledRunVerified'] is False
assert len(catalog['coverage']) >= 6
print(f'PASS: HTML IDs/ARIA references, labels, relative assets, reduced motion, safe DOM; {len(seen)} public resource records validated')
