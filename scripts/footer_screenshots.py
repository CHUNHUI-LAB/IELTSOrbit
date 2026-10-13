"""Artifact-only desktop footer evidence; stdlib + runner-preinstalled Chrome.

Run only in GitHub Actions. No browser/package downloads or security bypasses.
Screenshots need human review; passing assertions are not visual approval.
"""
import argparse
import base64
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request

VIEWPORTS = [(1440, 900), (1920, 1080)]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'
RELATED = ['https://chunhui-lab.github.io/RoboPaperAtlas/',
           'https://chunhui-lab.github.io/GradCompass/']
FOOTER = ['#library', 'https://github.com/CHUNHUI-LAB/IELTSOrbit',
          'https://github.com/CHUNHUI-LAB/GradCompass', *RELATED]


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def wait_for(check, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = check()
        if value:
            return value
        time.sleep(.1)
    raise RuntimeError('Timed out waiting for browser assertion')


def check_geometry(data):
    require(data['viewport'] in [list(v) for v in VIEWPORTS], 'Wrong desktop viewport')
    width, height = data['viewport']
    require(data['documentWidth'] <= width, 'Horizontal page overflow')
    require([row['href'] for row in data['links']] == FOOTER, 'Footer links changed')
    for row in data['links']:
        x, y, w, h = row['rect']
        require(w > 0 and h > 0 and x >= 0 and y >= 0 and x+w <= width+1 and y+h <= height+1,
                'Footer link outside viewport: ' + row['href'])
        require(row['visible'] and row['hit'] and not row['clipped'], 'Footer text hidden/clipped')
        require(row['fontSize'] >= 13, 'Footer text too small')
        if row['href'] != '#library':
            require(row['target'] == '_blank' and set(row['rel'].split()) == {'noopener', 'noreferrer'},
                    'Unsafe external anchor')


def contrast_ratio(first, second):
    def luminance(color):
        values = [c/255 for c in color]
        values = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in values]
        return sum(c*w for c,w in zip(values, [.2126,.7152,.0722]))
    require(len(first) == len(second) == 3, 'Unresolved focus colors')
    a,b = sorted([luminance(first),luminance(second)])
    return (b+.05)/(a+.05)


def check_focus(data):
    require(data['focusVisible'] and data['opaque'], 'Keyboard focus hidden')
    require(data['outlineStyle'] not in ['none','hidden'] and data['outlineWidth'] >= 2,
            'No measurable focus outline')
    require(contrast_ratio(data['outlineColor'],data['background']) >= 3, 'Focus outline lacks contrast')
    x,y,w,h = data['rect']
    padding = data['outlineWidth']+max(0,data['outlineOffset'])
    width,height = data['viewport']
    require(x-padding >= 0 and y-padding >= 0 and x+w+padding <= width and y+h+padding <= height,
            'Focus outline outside screenshot')


def check_destination(data, url):
    project = url.rstrip('/').rsplit('/',1)[-1]
    require(data['url'] == url and data['documentURI'] == url, 'Wrong destination/error document')
    require(data['readyState'] == 'complete' and not data['errorPage'], 'Destination not ready or browser error')
    titles = {'RoboPaperAtlas': {'RoboPaperAtlas'},
              'GradCompass': {'GradCompass · 找导师与项目', '找导师 · GradCompass'}}
    require(data['title'] in titles[project] and data['brand'] == project and data['bodyLength'] >= 100,
            'Destination lacks expected project identity/content')
    require(data['openerNull'], 'External tab has opener')


FOCUS = r"""
const a=document.activeElement,s=getComputedStyle(a),r=a.getBoundingClientRect();
function rgb(value){const m=/^rgba?\(([^)]+)\)$/.exec(value);if(!m)return [];const n=m[1].split(',').map(Number);return n.length===3||n[3]===1?n.slice(0,3):[];}
let background=[],opaque=true;
for(let n=a;n;n=n.parentElement){const c=getComputedStyle(n);if(!background.length)background=rgb(c.backgroundColor);if(c.visibility!=='visible'||c.display==='none'||Number(c.opacity)!==1)opaque=false;}
return {focusVisible:a.matches(':focus-visible'),opaque,outlineStyle:s.outlineStyle,
outlineWidth:parseFloat(s.outlineWidth),outlineOffset:parseFloat(s.outlineOffset),
outlineColor:rgb(s.outlineColor),background:background.length?background:[255,255,255],
boxShadow:s.boxShadow,rect:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight]};
"""

DESTINATION = r"""
return {url:location.href,documentURI:document.documentURI,readyState:document.readyState,
title:document.title,brand:(document.querySelector('header .brand')?.textContent||'').replace(/\s/g,''),
bodyLength:(document.body?.innerText||'').trim().length,
errorPage:!!document.querySelector('#main-frame-error,.neterror')||document.documentURI.startsWith('chrome-error:'),
openerNull:window.opener===null};
"""


def check_click_target(data):
    x,y,w,h = data['rect']
    width,height = data['viewport']
    require(data['visible'] and data['hit'] and not data['disabled'], 'Native click target hidden or obscured')
    require(w > 0 and h > 0 and x >= 0 and y >= 0 and x+w <= width+1 and y+h <= height+1,
            'Native click target outside viewport after normal scrolling')


CLICK_PROOF = """
const a=arguments[0],r=a.getBoundingClientRect(),s=getComputedStyle(a);
const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
return {rect:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight],
visible:s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)===1,
disabled:!!a.disabled,hit:hit===a||a.contains(hit),hitTag:hit?.tagName,hitId:hit?.id,
scroll:[scrollX,scrollY],url:location.href};
"""


GEOMETRY = """
return {viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,
links:[...document.querySelectorAll('.site-footer a')].map(a=>{
 const r=a.getBoundingClientRect(),s=getComputedStyle(a),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
 let visible=true;for(let n=a;n;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility!=='visible'||Number(c.opacity)!==1)visible=false;}
 return {href:a.getAttribute('href'),target:a.target,rel:a.rel,text:a.textContent,
 rect:[r.x,r.y,r.width,r.height],fontSize:parseFloat(s.fontSize),visible,
 hit:hit===a||a.contains(hit),clipped:a.scrollWidth>a.clientWidth+1||a.scrollHeight>a.clientHeight+1};})};
"""


class Driver:
    def __init__(self, port):
        self.url = f'http://127.0.0.1:{port}'
        self.session = None
        self.diagnostics = []

    def request(self, method, path, data=None):
        request = urllib.request.Request(self.url+path, method=method,
            data=None if data is None else json.dumps(data).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=65) as response:
                value = json.load(response)['value']
        except urllib.error.HTTPError as error:
            # Local WebDriver response, not an external page body. Preserve its
            # protocol error and message so HTTP status alone cannot hide cause.
            body = error.read(65536).decode('utf-8', errors='replace')
            diagnostic = {'method':method,'path':path,'status':error.code,'body':body}
            self.diagnostics.append(diagnostic)
            raise RuntimeError('WebDriver HTTP '+str(error.code)+': '+body) from error
        if isinstance(value, dict) and value.get('error'):
            raise RuntimeError(str(value))
        return value

    def call(self, method, path, data=None):
        return self.request(method, '/session/'+self.session+path, data)

    def js(self, script, *args):
        return self.call('POST', '/execute/sync', {'script':script, 'args':list(args)})

    def selector(self, selector):
        return self.call('POST', '/element', {'using':'css selector', 'value':selector})

    def click(self, selector):
        element = self.selector(selector)
        # Footer return changes document height and can leave native smooth
        # scrolling active. Scroll normally, settle, then retain WebDriver's
        # actual pointer click (never a JavaScript click or a hidden-element bypass).
        self.js("arguments[0].scrollIntoView({block:'center',inline:'nearest'});", element)
        self.settle()
        proof = self.js(CLICK_PROOF, element)
        self.diagnostics.append({'action':'click','selector':selector,'proof':proof})
        check_click_target(proof)
        self.call('POST', '/element/'+element[ELEMENT]+'/click', {})

    def key(self, value):
        self.call('POST', '/actions', {'actions':[{'type':'key','id':'keyboard','actions':[
            {'type':'keyDown','value':value},{'type':'keyUp','value':value}]}]})

    def settle(self):
        self.call('POST', '/execute/async', {'script':
            'const done=arguments[arguments.length-1];document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))));', 'args':[]})
        # The application uses native smooth scrolling. Do not override its CSS.
        previous = None
        stable = 0
        for _ in range(60):
            current = self.js('return [scrollX,scrollY]')
            stable = stable+1 if current == previous else 0
            if stable >= 4:
                return
            previous = current
            time.sleep(.1)
        raise RuntimeError('Scrolling did not settle')


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='footer-screenshots')
    args = parser.parse_args()
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Browser capture is CI-only')
    root = Path(__file__).resolve().parents[1]
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {'status':'running','viewports':VIEWPORTS,'scenes':[],
              'scope':'Desktop footer and original navigation; no mobile or full browser-suite claim'}
    process = server = driver = None
    log = (output/'chromedriver.log').open('w')
    def save():
        (output/'receipt.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    def capture(name):
        driver.settle()
        data = base64.b64decode(driver.call('GET', '/screenshot'))
        require(data.startswith(b'\x89PNG\r\n\x1a\n'), 'Invalid screenshot')
        (output/(name+'.png')).write_bytes(data)
        report['scenes'].append({'file':name+'.png','sha256':hashlib.sha256(data).hexdigest()})
        save()
    try:
        actual = subprocess.check_output(['git','rev-parse','HEAD'], cwd=root, text=True).strip()
        require(actual == os.environ.get('EXPECTED_HEAD'), 'Checkout is not the exact PR head')
        report['commit'] = actual
        report['sourceSha256'] = {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [root/'index.html',root/'scripts/footer_screenshots.py',root/'assets/app.js',root/'assets/styles.css',root/'assets/orbit-ui.css']}
        binary = shutil.which('google-chrome') or shutil.which('google-chrome-stable')
        executable = shutil.which('chromedriver')
        if not executable and os.environ.get('CHROMEWEBDRIVER'):
            candidate = Path(os.environ['CHROMEWEBDRIVER'])/'chromedriver'
            if candidate.is_file():
                executable = str(candidate)
        require(binary and executable, 'Preinstalled Chrome/ChromeDriver required; no download fallback')
        report['chromeVersion'] = subprocess.check_output([binary,'--version'], text=True).strip()
        report['driverVersion'] = subprocess.check_output([executable,'--version'], text=True).strip()
        report['chineseFonts'] = subprocess.check_output(['fc-list',':lang=zh','family'], text=True).splitlines()
        require(report['chineseFonts'], 'Chinese fonts required for reviewable screenshots')
        save()
        server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(root)))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        port = free_port()
        process = subprocess.Popen([executable,f'--port={port}','--allowed-ips=127.0.0.1'],stdout=log,stderr=subprocess.STDOUT)
        driver = Driver(port)
        def ready():
            require(process.poll() is None, 'ChromeDriver exited')
            try:
                return driver.request('GET','/status').get('ready')
            except OSError:
                return False
        wait_for(ready)
        session = driver.request('POST','/session',{'capabilities':{'alwaysMatch':{
            'browserName':'chrome','goog:chromeOptions':{'binary':binary,'args':['--headless=new']}}}})
        driver.session = session['sessionId']
        driver.call('POST','/timeouts',{'pageLoad':60000,'script':30000,'implicit':0})
        base = f'http://127.0.0.1:{server.server_port}/'
        for width,height in VIEWPORTS:
            prefix = f'{width}x{height}'
            driver.call('POST','/goog/cdp/execute',{'cmd':'Emulation.setDeviceMetricsOverride',
                'params':{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False}})
            driver.call('POST','/url',{'url':base})
            wait_for(lambda:driver.js("return document.querySelectorAll('.resource-card').length>0"))
            capture(prefix+'-01-original-navigation')
            driver.js("document.querySelector('.site-footer').scrollIntoView({block:'end'});")
            driver.settle()
            geometry = driver.js(GEOMETRY)
            check_geometry(geometry)
            report.setdefault('footer',[]).append(geometry)
            capture(prefix+'-02-footer')
            # Real sequential Tab traversal, from a freshly loaded document.
            driver.call('POST','/url',{'url':base})
            wait_for(lambda:driver.js("return document.querySelectorAll('.resource-card').length>0"))
            seen = []
            for _ in range(240):
                driver.key('\ue004')
                href = driver.js("const a=document.activeElement;return a?.closest('.site-footer')&&a.tagName==='A'?a.getAttribute('href'):null")
                if href and href not in seen:
                    seen.append(href)
                    driver.js("document.activeElement.scrollIntoView({block:'center'});")
                    driver.settle()
                    focus = driver.js(FOCUS)
                    check_focus(focus)
                    report.setdefault('focus',[]).append({'viewport':[width,height],'href':href,'proof':focus})
                    if href in RELATED:
                        capture(prefix+'-03-focus-'+href.split('/')[-2])
                if seen == FOOTER:
                    break
            require(seen == FOOTER, 'Footer unreachable in natural Tab order')
            report.setdefault('keyboard',[]).append({'viewport':[width,height],'order':seen})
            origin = driver.call('GET','/window')
            original_url = driver.call('GET','/url')
            for url in RELATED:
                before = driver.call('GET','/window/handles')
                driver.click('.site-footer a[href="'+url+'"]')
                handles = wait_for(lambda:(h if len(h := driver.call('GET','/window/handles')) == len(before)+1 else None))
                popup = next(h for h in handles if h not in before)
                driver.call('POST','/window',{'handle':popup})
                wait_for(lambda:driver.call('GET','/url') == url)
                wait_for(lambda:driver.js("return document.readyState==='complete'"))
                destination = driver.js(DESTINATION)
                check_destination(destination, url)
                report.setdefault('clicks',[]).append({'viewport':[width,height],'expected':url,'proof':destination})
                capture(prefix+'-destination-'+url.split('/')[-2])
                driver.call('DELETE','/window')
                driver.call('POST','/window',{'handle':origin})
                require(driver.call('GET','/url') == original_url, 'Original page changed after external link')
            # Keep the existing footer brand and top-level tab/history behavior.
            driver.click('.footer-brand')
            wait_for(lambda:driver.js("return location.hash==='#library'&&!document.getElementById('panel-library').hidden"))
            driver.click('#tab-exams')
            wait_for(lambda:driver.js("return location.hash==='#exams'&&!document.getElementById('panel-exams').hidden"))
            driver.call('POST','/back',{})
            wait_for(lambda:driver.js("return location.hash==='#library'&&!document.getElementById('panel-library').hidden"))
            driver.call('POST','/forward',{})
            wait_for(lambda:driver.js("return location.hash==='#exams'&&!document.getElementById('panel-exams').hidden"))
            driver.js("document.querySelector('.site-footer').scrollIntoView({block:'end'});")
            driver.settle()
            check_geometry(driver.js(GEOMETRY))
            capture(prefix+'-04-return-and-original-history')
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = type(error).__name__+': '+str(error)
        if driver and driver.session:
            try:
                capture('failure-at-current-state')
            except Exception as screenshot_error:
                report['failureScreenshotError'] = str(screenshot_error)
        raise
    finally:
        if driver:
            report['webdriverDiagnostics'] = driver.diagnostics
        save()
        if driver and driver.session:
            try:
                driver.request('DELETE','/session/'+driver.session)
            except Exception:
                pass
        if process:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        if server:
            server.shutdown()
            server.server_close()
        log.close()


if __name__ == '__main__':
    main()
