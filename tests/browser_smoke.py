from playwright.sync_api import sync_playwright
import json
import os
import sys

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_PATH'))
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
    page.set_default_timeout(8000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('BASE_URL','http://localhost:5173'));page.wait_for_load_state('networkidle')
    def seed(index=0,roll=0):
        if page.locator('[data-pause]').get_attribute('aria-pressed')!='true':page.locator('[data-pause]').click()
        page.evaluate('''async([index,roll])=>{const {createGame}=await import('/src/engine.js');localStorage.setItem('field-medic-v2',JSON.stringify({game:{...createGame(index,()=>roll),paused:true},stats:{saved:0,lost:0}}))}''',[index,roll])
        page.reload();page.wait_for_load_state('networkidle')
    def state():
        return page.evaluate("JSON.parse(localStorage.getItem('field-medic-v2')).game")
    def menu(part,injury=None):
        selector=f'.patient-scene [data-injury="{injury}"]' if injury else f'.patient-scene path[data-part="{part}"]'
        node=page.locator(selector);node.scroll_into_view_if_needed()
        r=node.bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2,button='right')
        page.locator('#body-context-menu').wait_for(state='visible')
    def prepare_iv(point=(400,132.42105263157896)):
        page.locator('#procedure').wait_for(state='visible')
        coordinates=page.locator('#iv-site-map').evaluate('(el,p)=>{const q=new DOMPoint(p[0],p[1]).matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y}}',list(point))
        page.mouse.click(coordinates['x'],coordinates['y'])
        page.locator('[data-procedure-next]').click()
        slider=page.locator('#approach-input');slider.focus();page.keyboard.press('Home')
        for _ in range(42):page.keyboard.press('ArrowRight')
        page.locator('[data-procedure-next]').click()
    def complete_iv():
        prepare_iv()
        page.screenshot(path='/tmp/field-medic-iv-minigame.png')
        page.locator('[data-hold]').focus();page.keyboard.down('Space')
        page.wait_for_function("Number(document.querySelector('#depth-meter').getAttribute('aria-valuenow'))>=62")
        page.keyboard.up('Space')
        assert 'Wkłucie wykonane' in page.locator('.procedure-result').inner_text()
        page.locator('[data-procedure-finish]').click()
        page.locator('#procedure').wait_for(state='hidden')
    def choose(action):
        page.locator(f'[data-context-action="{action}"]').click()
        if action=='iv':complete_iv()
    seed()
    page.locator('[data-pick="dressing"]').click();assert page.locator('.tool-in-hand').count()==1
    page.keyboard.press('Escape');assert page.locator('.tool-in-hand').count()==0
    page.locator('.command-bar [data-action="vitals"]').focus();page.keyboard.press('l')
    assert page.locator('.log').count()==1
    page.keyboard.press('l');assert page.locator('.log').count()==0
    page.keyboard.down('Digit1');elapsed_after_first=state()['elapsed']
    page.keyboard.down('Digit1');page.keyboard.up('Digit1')
    assert state()['elapsed']==elapsed_after_first
    if '--keyboard-only' in sys.argv:
        assert not errors,errors
        print(json.dumps({'game_shortcuts':'passed','escape_puts_away_item':'passed','held_key_does_not_repeat_actions':'passed','console_errors':errors}))
        browser.close();raise SystemExit(0)
    seed()
    # Cancellation before puncture is free; failure and abortion after starting are not.
    original=state()
    menu('leftForearm');page.locator('[data-context-action="iv"]').click();page.keyboard.press('Escape')
    assert state()['elapsed']==original['elapsed'] and state()['supplies']['iv']==original['supplies']['iv']
    menu('leftForearm');page.locator('[data-context-action="iv"]').click();prepare_iv((400,230))
    page.locator('[data-hold]').focus();page.keyboard.down('Space')
    page.wait_for_function("Number(document.querySelector('#depth-meter').getAttribute('aria-valuenow'))>=62")
    page.keyboard.up('Space');assert 'Nie udało' in page.locator('.procedure-result').inner_text()
    page.locator('[data-procedure-finish]').click();assert state()['supplies']['iv']==2
    menu('leftForearm');page.locator('[data-context-action="iv"]').click();prepare_iv()
    page.locator('[data-hold]').focus();page.keyboard.down('Space')
    page.wait_for_function("Number(document.querySelector('#depth-meter').getAttribute('aria-valuenow'))>=10")
    page.keyboard.press('Escape');page.keyboard.up('Space')
    page.locator('#procedure').wait_for(state='hidden');assert state()['supplies']['iv']==1
    assert state()['body']['leftForearm']['ivAt'] is None
    seed()
    page.screenshot(path='/tmp/field-medic-initial.png',full_page=True)
    assert page.locator('.patient-scene').count()==1
    assert not page.locator('.patient-scene image').count()
    before=state()['elapsed']
    menu('leftThigh','injury-0')
    assert state()['elapsed']==before
    choose('dressing')
    assert page.locator('[data-injury="injury-0"]').count()==1
    assert state()['injuries'][0]['treatments']['dressing']==0
    assert not state()['injuries'][1]['treatments']
    menu('leftThigh','injury-1');choose('hemostatic')
    menu('leftThigh');choose('tourniquet')
    assert page.locator('[data-device="tourniquet"][data-part="leftThigh"]').count()==1
    menu('rightUpperArm');choose('tourniquet')
    menu('rightForearm');choose('iv')
    assert page.locator('[data-iv-site="rightForearm"].occluded').count()==1
    menu('rightForearm')
    assert 'Staza odcina IV' in page.locator('[data-context-action="morphine"]').inner_text()
    choose('morphine');assert not state()['medications']
    # Pick an item, then place it by clicking the other arm.
    page.locator('[data-pick="iv"]').click()
    page.locator('.patient-scene path[data-part="leftForearm"]').click()
    complete_iv()
    assert state()['body']['leftForearm']['ivAt'] is not None
    # Native HTML drag and drop from the kit to the local IV site.
    page.locator('[data-drag-item="fluid"]').drag_to(page.locator('[data-device="iv"][data-part="leftForearm"]'))
    assert state()['infusions'][0]['site']=='leftForearm'
    assert page.locator('[data-iv-site="leftForearm"] .iv-line').count()==1
    menu('leftForearm');choose('morphine')
    assert state()['medications'][0]['site']=='leftForearm'
    page.locator('.patient-scene path[data-part="head"]').focus();page.keyboard.press('Shift+F10')
    assert page.locator('#body-context-menu').is_visible()
    page.keyboard.press('ArrowDown');page.keyboard.press('Escape')
    assert not page.locator('#body-context-menu').is_visible()
    elapsed=state()['elapsed']
    page.locator('[data-guide]').first.click();page.get_by_role('searchbox').fill('morfina')
    assert 'Jak działają leki' in page.locator('.guide-results').inner_text()
    page.get_by_role('button',name='Zamknij poradnik').click();assert state()['elapsed']==elapsed
    page.screenshot(path='/tmp/field-medic-desktop.png',full_page=True)
    page.reload();page.wait_for_load_state('networkidle');assert state()['elapsed']==elapsed
    assert page.locator('[data-iv-site="rightForearm"].occluded').count()==1
    page.set_viewport_size({'width':1366,'height':768})
    assert page.locator('.command-bar').bounding_box()['y']+page.locator('.command-bar').bounding_box()['height']<=769
    page.screenshot(path='/tmp/field-medic-laptop.png')
    assert page.locator('.patient-scene').bounding_box()['height']>200
    page.screenshot(path='/tmp/field-medic-laptop.png')
    for width in [390,320]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('[data-context-open]').click()
        rect=page.locator('#body-context-menu').bounding_box()
        assert rect['x']>=0 and rect['x']+rect['width']<=width
        page.keyboard.press('Escape')
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/field-medic-mobile.png',full_page=True)
    # The same insertion control also works with a held mouse button.
    seed()
    menu('leftForearm');page.locator('[data-context-action="iv"]').click();prepare_iv()
    page.locator('[data-hold]').hover();page.mouse.down()
    page.wait_for_function("Number(document.querySelector('#depth-meter').getAttribute('aria-valuenow'))>=62")
    page.mouse.up();assert 'Wkłucie wykonane' in page.locator('.procedure-result').inner_text()
    page.locator('[data-procedure-finish]').click();assert state()['body']['leftForearm']['ivAt'] is not None
    # A real emulated touchscreen supplies pointer capture and release events.
    touch_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    touch=touch_context.new_page();touch.set_default_timeout(8000);touch.on('pageerror',lambda e:errors.append(str(e)))
    touch.goto(os.environ.get('BASE_URL','http://localhost:5173'));touch.wait_for_load_state('networkidle')
    touch.evaluate("""async()=>{const {createGame}=await import('/src/engine.js');localStorage.setItem('field-medic-v2',JSON.stringify({game:{...createGame(0,()=>0),paused:true},stats:{saved:0,lost:0}}))}""")
    touch.reload();touch.wait_for_load_state('networkidle')
    touch.locator('.part-button[data-part="leftForearm"]').tap();touch.locator('[data-context-action="iv"]').tap()
    coordinates=touch.locator('#iv-site-map').evaluate('(el)=>{const p=new DOMPoint(400,132.42105263157896).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y}}')
    touch.touchscreen.tap(coordinates['x'],coordinates['y']);touch.locator('[data-procedure-next]').tap()
    touch.locator('#approach-input').evaluate("el=>{el.value='42';el.dispatchEvent(new Event('input',{bubbles:true}))}")
    touch.locator('[data-procedure-next]').tap();touch.locator('[data-hold]').scroll_into_view_if_needed()
    rect=touch.locator('[data-hold]').bounding_box();cdp=touch.context.new_cdp_session(touch)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]})
    touch.wait_for_function("Number(document.querySelector('#depth-meter').getAttribute('aria-valuenow'))>=62")
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert 'Wkłucie wykonane' in touch.locator('.procedure-result').inner_text()
    assert touch.locator('#procedure').is_visible()
    touch.screenshot(path='/tmp/field-medic-iv-mobile.png',full_page=True)
    touch.locator('[data-procedure-finish]').tap()
    assert touch.evaluate("JSON.parse(localStorage.getItem('field-medic-v2')).game.body.leftForearm.ivAt") is not None
    touch_context.close()
    seed(1,.99);page.locator('[data-action="transport"]').click()
    menu('rightThigh');choose('tourniquet')
    menu('chest');choose('blanket')
    page.locator('[data-tab="observe"]').click()
    for _ in range(30):
        if page.locator('.debrief').count():break
        page.locator('[data-action="wait60"]').click()
    assert state()['status']=='saved'
    page.locator('[data-new]').first.click();assert state()['elapsed']==0
    assert not errors,errors
    print(json.dumps({'game_cockpit':'passed','IV_minigame_success_failure_abort':'passed','mouse_and_touch_insertion':'passed','horizontal_outline':'passed','wound_context_menu':'passed','visible_equipment':'passed','local_IV_and_tourniquet':'passed','pick_and_place':'passed','native_drag_drop':'passed','keyboard':'passed','guide':'passed','persistence':'passed','mobile_320_and_390':'passed','25_minute_rescue':'passed','console_errors':errors}))
    browser.close()
