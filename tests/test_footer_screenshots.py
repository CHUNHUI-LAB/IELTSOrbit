"""Pure contract tests: importing the capture module never launches a browser."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('footer_screenshots', ROOT/'scripts/footer_screenshots.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class FooterCaptureContracts(unittest.TestCase):
    def fixture(self):
        return {'viewport':[1440,900],'documentWidth':1440,'links':[
            {'href':href,'target':'_blank','rel':'noopener noreferrer','rect':[100,100+i*60,300,44],
             'visible':True,'hit':True,'clipped':False,'fontSize':13}
            for i,href in enumerate(m.FOOTER)]}

    def test_valid_desktop_sizes(self):
        for viewport in m.VIEWPORTS:
            data = self.fixture()
            data['viewport'] = list(viewport)
            m.check_geometry(data)

    def test_rejects_invisible_unsafe_clipped_and_wrong_links(self):
        for key,value in [('href','https://example.com/'),('target','_self'),('rel','opener'),
                          ('visible',False),('hit',False),('clipped',True),('fontSize',10),
                          ('rect',[1400,100,200,44]),('rect',[100,890,300,44])]:
            with self.subTest(key=key,value=value):
                data = self.fixture()
                data['links'][1][key] = value
                with self.assertRaises(RuntimeError):
                    m.check_geometry(data)

    def test_rejects_mobile_overflow_missing_and_duplicates(self):
        for key,value in [('viewport',[390,844]),('documentWidth',1500),
                          ('links',self.fixture()['links'][:-1]),
                          ('links',self.fixture()['links']+[self.fixture()['links'][0]])]:
            data = self.fixture()
            data[key] = value
            with self.assertRaises(RuntimeError):
                m.check_geometry(data)

    def test_focus_requires_real_visible_contrasting_outline(self):
        good = {'focusVisible':True,'opaque':True,'outlineStyle':'solid','outlineWidth':3,
                'outlineOffset':4,'outlineColor':[55,120,187],'background':[255,255,255],
                'rect':[100,100,300,44],'viewport':[1440,900]}
        m.check_focus(good)
        for key,value in [('outlineStyle','none'),('outlineWidth',0),('outlineColor',[255,255,255]),
                          ('outlineColor',[]),('opaque',False),('focusVisible',False),('rect',[0,0,300,44])]:
            with self.subTest(key=key,value=value), self.assertRaises(RuntimeError):
                m.check_focus(dict(good,**{key:value}))

    def test_destination_rejects_error_empty_unready_and_wrong_project(self):
        for url in m.RELATED:
            project = url.rstrip('/').rsplit('/',1)[-1]
            good = {'url':url,'documentURI':url,'readyState':'complete','errorPage':False,
                    'title':project,'brand':project,'bodyLength':1000,'openerNull':True}
            m.check_destination(good,url)
            for key,value in [('documentURI','chrome-error://chromewebdata/'),('errorPage',True),
                              ('bodyLength',0),('readyState','loading'),('title','Site unavailable'),
                              ('brand',''),('openerNull',False),('url','about:blank')]:
                with self.subTest(key=key,value=value), self.assertRaises(RuntimeError):
                    m.check_destination(dict(good,**{key:value}),url)

    def test_artifact_only_workflow(self):
        workflow = (ROOT/'.github/workflows/footer-screenshots.yml').read_text()
        for forbidden in ['pull_request_target','pages: write','id-token: write','deploy-pages',
                          'npm install','pip install','--no-sandbox','workflow_dispatch']:
            self.assertNotIn(forbidden,workflow)
        self.assertIn('contents: read',workflow)
        self.assertIn('persist-credentials: false',workflow)
        self.assertIn('github.event.pull_request.head.sha',workflow)
        self.assertIn('actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',workflow)


if __name__ == '__main__':
    unittest.main()
