"""Real desktop keys and controlled late-catalog evidence for subject focus."""
from desktop_driver import run, require, wait_for, FOCUS, check_focus, CatalogGate

SKILLS = ['listening','reading','writing','speaking','all']
STATE = """const a=document.activeElement;return {hash:location.hash,skill:document.getElementById('skill-filter').value,
 activeSkill:a?.dataset?.skill||null,activeId:a?.id||null,connected:a?.isConnected,
 selected:[...document.querySelectorAll('#skill-navigation [aria-pressed="true"]')].map(n=>n.dataset.skill),
 count:document.querySelectorAll('.resource-card').length,storage:localStorage.getItem('ieltsorbit.local.v1')};"""

SUBJECT_OUTLINE = """const a=document.activeElement;
if(!a.matches('#panel-library .skill-button'))return null;
return {activeSkill:a.dataset.skill,siblings:[...a.parentElement.querySelectorAll('.skill-button')]
 .filter(n=>n!==a).map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {
 skill:n.dataset.skill,rect:[r.x,r.y,r.width,r.height],hovered:n.matches(':hover'),
 visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)!==0};})};"""


def check_subject_outline(focus, subjects):
    """Reject geometric overlap even if a sibling is not currently hovered.

    The outer outline edge is offset + width from the button border. An inset
    outline therefore needs no sibling space; edge-touching is not overlap.
    This guards these non-overlapping sibling controls, not arbitrary page paint.
    """
    require(subjects['activeSkill'] in SKILLS, 'Unknown focused subject')
    require({item['skill'] for item in subjects['siblings']} == set(SKILLS)-{subjects['activeSkill']}
            and len(subjects['siblings']) == len(SKILLS)-1, 'Incomplete subject sibling evidence')
    x,y,w,h = focus['rect']
    edge = focus['outlineOffset']+focus['outlineWidth']
    left,top,right,bottom = x-edge,y-edge,x+w+edge,y+h+edge
    require(right > left and bottom > top, 'Invalid outline bounds')
    for sibling in subjects['siblings']:
        if not sibling['visible']:
            continue
        sx,sy,sw,sh = sibling['rect']
        overlap = left < sx+sw and right > sx and top < sy+sh and bottom > sy
        require(not overlap, 'Subject focus outline overlaps sibling '+sibling['skill'])


def check_subject(state, skill, storage, focus=True):
    require(state['hash'] == ('#library' if skill == 'all' else '#library/'+skill), 'Subject route mismatch')
    require(state['skill'] == skill and state['selected'] == [skill], 'Subject filter or pressed state mismatch')
    require(state['storage'] == storage, 'Navigation changed favorites or plan storage')
    if focus:
        require(state['connected'] and state['activeSkill'] == skill, 'Subject focus lost from the live replacement control')


def scenario(driver, base, viewport, report, capture, server):
    prefix = f'{viewport[0]}x{viewport[1]}'
    def navigate(label, route='#library/listening'):
        driver.call('POST','/url',{'url':base+'?desktop-evidence='+prefix+'-'+label+route})
        wait_for(lambda:driver.js("return document.querySelectorAll('#skill-navigation [data-skill]').length===5"))
    def assert_focus():
        driver.settle()
        proof = driver.js(FOCUS)
        check_focus(proof)
        subjects = driver.js(SUBJECT_OUTLINE)
        if subjects is not None:
            check_subject_outline(proof,subjects)
            proof['subjectOutline'] = subjects
        return proof

    navigate('initial','#start')
    wait_for(lambda:driver.js("return document.querySelectorAll('.resource-card').length>0"))
    driver.js("window.scrollTo({left:0,top:0,behavior:'instant'});")
    capture(prefix+'-01-initial',viewport,True)
    driver.click('#tab-library')
    wait_for(lambda:driver.js("return !document.getElementById('panel-library').hidden"))
    storage = driver.js(STATE)['storage']
    for round_name,key in [('Enter','\ue007'),('Space',' ')]:
        if round_name == 'Space':
            navigate('space-round')
            wait_for(lambda:driver.js(STATE)['count']>0)
        # Put another subject in the selected state before keyboard traversal.
        # Each first keypress must cause a transition, so a no-op Space cannot pass.
        driver.click('#skill-navigation [data-skill="writing"]')
        driver.tab_to('#skill-navigation [data-skill="listening"]')
        for index,skill in enumerate(SKILLS):
            if index:
                driver.key('\ue004')
            before = driver.js(STATE)
            require(before['activeSkill'] == skill, 'Natural subject Tab order changed')
            require(before['selected'] != [skill], round_name+' must start from an unselected subject')
            for repeat in range(2):
                driver.key(key)
                driver.settle()
                state = driver.js(STATE)
                check_subject(state,skill,storage)
                focus = assert_focus()
                report['checks'].append({'viewport':list(viewport),'activation':round_name,'repeat':repeat,
                                         'subject':skill,'transitionFrom':before['selected'],'state':state,'focus':focus})
            capture(prefix+'-02-'+round_name.lower()+'-'+skill,viewport)
        driver.key('\ue004')
        require(driver.js("return document.activeElement.tagName!=='BODY'&&!document.activeElement.closest('#skill-navigation')"),
                'Tab after last subject did not leave the group')
        report['checks'].append({'viewport':list(viewport),'round':round_name,'tabAfterSubjectGroup':driver.js(STATE)})

    # First capture the known race with focus remaining on every subject.
    # Then leave the group before delivery: catalog arrival must not steal focus.
    for target in [*SKILLS,'search','recommendation-filter','tab-library']:
        gate = CatalogGate()
        server.catalog_gate = gate
        try:
            navigate('delayed-'+target)
            require(gate.requested.wait(10), 'Catalog request never reached controlled local server')
            require(driver.js(STATE)['count'] == 0 and not gate.released.is_set(), 'Catalog was not actually delayed')
            subject = target if target in SKILLS else 'reading'
            driver.tab_to('#skill-navigation [data-skill="'+subject+'"]')
            driver.key('\ue007')
            driver.settle()
            pending = driver.js(STATE)
            check_subject(pending,subject,storage)
            require(pending['count'] == 0, 'Delayed catalog completed before focus check')
            if target not in SKILLS:
                # Normal pointer or Tab focus is the only way to move off the subject.
                if target == 'tab-library':
                    driver.click('#tab-library')
                else:
                    driver.tab_to('#'+target)
                expected_id = target
                require(driver.js(STATE)['activeId'] == expected_id, 'Outside control was not focused')
            else:
                expected_id = None
            gate.released.set()
            require(gate.completed.wait(10), 'Delayed catalog response never completed')
            wait_for(lambda:driver.js(STATE)['count']>0)
            driver.settle()
            after = driver.js(STATE)
            # tab-library navigates to #library but retains the current subject filter.
            if target == 'tab-library':
                require(after['hash'] == '#library' and after['activeId'] == target and after['storage'] == storage,
                        'Catalog delivery stole focus from library tab or changed storage')
            else:
                check_subject(after,subject,storage,target in SKILLS)
                if expected_id:
                    require(after['activeId'] == expected_id, 'Catalog delivery stole focus from '+target)
            focus = assert_focus() if target != 'tab-library' else None
            capture(prefix+'-03-delayed-'+target,viewport)
            report['checks'].append({'viewport':list(viewport),'delayedCatalogTarget':target,
                                     'pending':pending,'after':after,'focus':focus,'realBytesReleased':True})
        finally:
            gate.released.set()
            server.catalog_gate = None


if __name__ == '__main__':
    run('IELTSOrbit',scenario)
