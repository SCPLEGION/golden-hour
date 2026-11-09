"""Browser regression checks for live parameters and the expanded cockpit.

Run with the local game server and Python Playwright installed. Optional env:
BASE_URL and PLAYWRIGHT_CHROMIUM_PATH, as with browser_smoke.py.
"""
from playwright.sync_api import sync_playwright
import json
import os

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5173')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_PATH'))
    page = browser.new_page(viewport={'width': 1366, 'height': 768}, device_scale_factor=1)
    page.set_default_timeout(8000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    def seed():
        # Stop the old in-memory driver before replacing its persistent save.
        if not state().get('paused', False):
            page.locator('[data-pause]').click()
        page.evaluate('''async () => {
            const { createGame } = await import('/src/engine.js');
            const game = createGame(0, () => 0);
            game.paused = false;
            game.speed = 1;
            game.monitoring = true;
            game.supplies.seal = 0;
            localStorage.setItem('field-medic-v2', JSON.stringify({ game, stats: { saved: 0, lost: 0 } }));
        }''')
        page.reload()
        page.wait_for_load_state('networkidle')

    def state():
        return page.evaluate("JSON.parse(localStorage.getItem('field-medic-v2')).game")

    def readings():
        return page.locator('[data-live]').evaluate_all("els => Object.fromEntries(els.filter(el => el.dataset.live !== 'time').map(el => [el.dataset.live, el.textContent]))")

    def elapsed():
        return state()['elapsed']

    def wait_for_elapsed_after(value, seconds=1):
        page.wait_for_function("([value, seconds]) => JSON.parse(localStorage.getItem('field-medic-v2')).game.elapsed >= value + seconds", arg=[value, seconds], timeout=8000)

    seed()
    initial = state()
    assert initial['scenarioId'] == 'gunshot'
    assert initial['supplies']['seal'] == 0, 'The live driver overwrote the deterministic test seed'
    first_readings = readings()
    first_clock = page.locator('[data-clock]').inner_text()
    wait_for_elapsed_after(initial['elapsed'], 3)
    after_live = state()
    assert len(after_live['monitorHistory']) > len(initial['monitorHistory']), 'Live monitor did not collect history'
    assert page.locator('[data-clock]').inner_text() != first_clock, 'Clock remained frozen'
    assert readings() != first_readings, 'All physiological readings remained frozen'
    assert page.locator('[data-trend="pulse"]').get_attribute('d'), 'Pulse history is not drawn'
    assert page.locator('[data-trend="oxygen"]').get_attribute('d'), 'Oxygen history is not drawn'

    page.locator('[data-pause]').click()
    assert state()['paused'] is True
    paused_at = elapsed()
    paused_readings = readings()
    page.wait_for_timeout(1550)
    assert elapsed() == paused_at, 'Pause did not stop the automatic simulation'
    assert readings() == paused_readings, 'Readings changed while paused'
    assert 'Pauza' in page.locator('[data-monitor-status]').inner_text()

    page.locator('[data-speed="4"]').click()
    page.locator('[data-pause]').click()
    resumed_at = elapsed()
    page.wait_for_timeout(1600)
    assert elapsed() >= resumed_at + 4, '4× speed did not advance at least four simulated seconds'
    page.locator('[data-speed="1"]').click()

    page.locator('[data-monitor]').click()
    assert state()['monitoring'] is False
    disconnected_at = elapsed()
    frozen = readings()
    wait_for_elapsed_after(disconnected_at, 2)
    assert readings() == frozen, 'Disconnected monitor did not preserve the last reading'
    page.locator('[data-monitor]').click()
    assert state()['monitoring'] is True
    reconnected_at = elapsed()
    wait_for_elapsed_after(reconnected_at, 2)
    assert state()['vitals']['time'] >= reconnected_at + 1
    assert readings() != frozen, 'Reconnected monitor did not resume readings'

    page.locator('[data-guide]').first.click()
    page.locator('#guide').wait_for(state='visible')
    guide_at = elapsed()
    page.wait_for_timeout(1500)
    assert elapsed() == guide_at, 'Guide should suspend the automatic clock'
    page.get_by_role('button', name='Zamknij poradnik').click()
    wait_for_elapsed_after(guide_at, 1)

    page.locator('.part-button[data-part="leftForearm"]').click()
    page.locator('[data-context-open]').click()
    page.locator('[data-context-action="iv"]').click()
    page.locator('#procedure').wait_for(state='visible')
    procedure_at = elapsed()
    supplies_before_cancel = state()['supplies']['iv']
    page.wait_for_timeout(1500)
    assert elapsed() == procedure_at, 'IV preparation should suspend the automatic clock'
    page.keyboard.press('Escape')
    page.locator('#procedure').wait_for(state='hidden')
    assert state()['supplies']['iv'] == supplies_before_cancel
    wait_for_elapsed_after(procedure_at, 1)

    # The live driver may replace HUD nodes, but never the user's input or bag.
    search = page.locator('[data-bag-search]')
    search.fill('opatrunek')
    search.focus()
    focused_at = elapsed()
    wait_for_elapsed_after(focused_at, 2)
    assert search.input_value() == 'opatrunek'
    assert search.evaluate('el => document.activeElement === el'), 'Live tick destroyed search focus'
    matches = page.locator('[data-bag-item]:not([hidden])')
    assert matches.count() > 0
    assert matches.evaluate_all("els => els.every(el => el.dataset.searchText.includes('opatrunek'))")
    search.fill('nieistniejacyprzedmiot123')
    assert page.locator('[data-bag-item]:not([hidden])').count() == 0
    assert page.locator('[data-bag-empty]').is_visible()
    search.fill('')
    page.locator('[data-bag-filter]').select_option('available')
    assert page.locator('[data-bag-item][data-available="false"]').count() > 0
    assert page.locator('[data-bag-item][data-available="false"]:not([hidden])').count() == 0
    page.locator('[data-bag-filter]').select_option('compatible')
    visible_compatible = page.locator('[data-bag-item]:not([hidden])')
    assert 0 < visible_compatible.count() < page.locator('[data-bag-item]').count()
    assert visible_compatible.evaluate_all("els => els.every(el => el.dataset.compatible === 'true')")
    page.locator('[data-bag-filter]').select_option('all')
    page.locator('.part-button[data-part="leftThigh"]').click()

    # Keep QA screenshots stable while preserving the newly collected trends.
    if not state()['paused']:
        page.locator('[data-pause]').click()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    bar = page.locator('.command-bar').bounding_box()
    assert bar['y'] + bar['height'] <= 769, 'Desktop action bar is outside the viewport'
    assert page.locator('.patient-scene').bounding_box()['height'] > 180
    page.screenshot(path='/tmp/field-medic-v05-desktop.png')

    for width in [390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Horizontal overflow at {width}px'
        page.locator('[data-pause]').scroll_into_view_if_needed()
        assert page.locator('[data-pause]').is_visible()
        page.locator('[data-speed="4"]').scroll_into_view_if_needed()
        assert page.locator('[data-speed="4"]').is_visible()
        page.locator('[data-bag-search]').scroll_into_view_if_needed()
        assert page.locator('[data-bag-search]').is_visible()
        page.locator('[data-context-open]').scroll_into_view_if_needed()
        page.locator('[data-context-open]').click()
        menu_rect = page.locator('#body-context-menu').bounding_box()
        assert menu_rect['x'] >= 0 and menu_rect['x'] + menu_rect['width'] <= width
        page.keyboard.press('Escape')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path='/tmp/field-medic-v05-mobile.png', full_page=True)

    assert not errors, errors
    print(json.dumps({
        'live_physiological_readings': 'passed',
        'history_and_sparklines': 'passed',
        'pause_and_4x_speed': 'passed',
        'disconnect_and_reconnect': 'passed',
        'guide_and_procedure_pause': 'passed',
        'search_focus_during_live_updates': 'passed',
        'inventory_search_and_filters': 'passed',
        'desktop_1366x768': 'passed',
        'mobile_390_and_320': 'passed',
        'console_errors': errors,
    }))
    browser.close()
