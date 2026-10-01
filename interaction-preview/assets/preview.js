(function () {
  'use strict';
  const core = window.IELTSCore;
  const $ = id => document.getElementById(id);
  const smallScreen = window.matchMedia('(max-width: 760px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resources = [];
  let visibleIds = [];
  let selectedId = null;
  let origin = null;
  let currentLayer = null;
  let animations = [];
  let transitionId = 0;
  let loaded = false;
  const rows = new Map();

  function fitWorkspaceToViewport() {
    if (smallScreen.matches) return;
    // Document position is stable when the user scrolls. Never resize the
    // work area merely because its viewport-relative top has moved.
    const workspace = $('workspace');
    const documentTop = workspace.getBoundingClientRect().top + window.scrollY;
    const available = window.innerHeight - documentTop - 24;
    const height = Math.max(300, Math.min(640, Math.floor(available)));
    workspace.style.setProperty('--workspace-height', height + 'px');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function filters() {
    return { query: $('search').value, sourceType: $('source-filter').value, skill: $('skill-filter').value };
  }

  function placeholder(message) {
    const layer = el('div', 'detail-layer detail-placeholder');
    layer.append(el('span', 'placeholder-index', '先了解，再开始'));
    const heading = el('h2', '', message || '选一份资料，\n留在这里慢慢看。');
    heading.id = 'detail-heading';
    layer.append(heading, el('p', '', visibleIds.length ? '用途、访问方式与核验说明会在这里展开。你的筛选和列表位置都还在。' : '调整上方筛选后，再从列表选择一份资料。'));
    return layer;
  }

  function detail(resource) {
    const layer = el('article', 'detail-layer');
    layer.dataset.resourceId = resource.id;
    const body = el('div', 'detail-scroll');
    const kicker = el('p', 'detail-kicker');
    kicker.append(el('span', '', core.labels.sourceType[resource.sourceType] || '公开资料'), el('span', '', resource.provider));
    const heading = el('h2', 'detail-title', resource.title);
    heading.id = 'detail-heading';
    body.append(kicker, heading, el('p', 'detail-summary', resource.summary));
    const facts = el('dl', 'detail-facts');
    [
      ['适用技能', resource.skills.map(skill => core.labels.skills[skill] || skill).join(' · ')],
      ['费用与访问', [resource.priceLabel, resource.accessLabel].filter(Boolean).join(' · ')]
    ].forEach(([label, value]) => {
      const fact = el('div');
      fact.append(el('dt', '', label), el('dd', '', value));
      facts.append(fact);
    });
    body.append(facts);
    const evidence = el('details', 'detail-evidence');
    evidence.append(el('summary', '', resource.commercial ? '核验范围与限制 · 含商业推广' : '核验范围与限制'));
    evidence.append(el('p', '', resource.evidenceScope || '以原始来源的当前页面为准。'));
    if (resource.caution) evidence.append(el('p', 'caution', resource.caution));
    body.append(evidence);
    const footer = el('div', 'detail-footer');
    const link = el('a', 'source-link');
    link.href = core.safeUrl(resource.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append(el('span', '', '查看来源'), el('span', '', '↗'));
    link.lastElementChild.setAttribute('aria-hidden', 'true');
    link.setAttribute('aria-label', '查看来源：' + resource.title);
    const checked = el('span', 'source-date', '资料核验\n' + (resource.checkedAt || '日期待补'));
    footer.append(link, checked);
    layer.append(body, footer);
    return layer;
  }

  function cancelTransitions() {
    transitionId += 1;
    for (const animation of animations) animation.cancel();
    animations = [];
    $('detail-stage').querySelectorAll('.is-outgoing').forEach(node => node.remove());
    if (currentLayer) currentLayer.style.opacity = '1';
  }

  function swapDetail(next, animate) {
    cancelTransitions();
    const id = transitionId;
    const previous = currentLayer;
    if (previous) {
      previous.classList.remove('is-current');
      previous.classList.add('is-outgoing');
      previous.inert = true;
      previous.setAttribute('aria-hidden', 'true');
      previous.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    }
    currentLayer = next;
    next.classList.add('is-current');
    $('detail-stage').append(next);
    if (!animate || reducedMotion.matches || typeof next.animate !== 'function') {
      if (previous) previous.remove();
      return;
    }
    const options = { duration: 280, easing: 'cubic-bezier(.2,.65,.25,1)', fill: 'both' };
    const enter = next.animate([{ opacity: 0 }, { opacity: 1 }], options);
    const leave = previous ? previous.animate([{ opacity: 1 }, { opacity: 0 }], options) : null;
    animations = [enter, leave].filter(Boolean);
    Promise.all(animations.map(animation => animation.finished.catch(() => null))).then(() => {
      if (id !== transitionId) return;
      if (previous) previous.remove();
      animations.forEach(animation => animation.cancel());
      animations = [];
    });
  }

  function syncRows() {
    rows.forEach((row, id) => row.setAttribute('aria-pressed', String(id === selectedId)));
    $('return-button').disabled = !selectedId;
    const index = visibleIds.indexOf(selectedId);
    $('detail-position').textContent = index >= 0 ? String(index + 1).padStart(2, '0') + ' / ' + String(visibleIds.length).padStart(2, '0') : '资料预览';
    $('workspace').dataset.selectedId = selectedId || '';
  }

  function selectResource(id, userInitiated = true) {
    const resource = resources.find(item => item.id === id);
    if (!resource || !visibleIds.includes(id)) return;
    if (selectedId === id) {
      if (smallScreen.matches && userInitiated) enterMobile();
      return;
    }
    if (userInitiated) origin = { id, windowY: window.scrollY, listY: $('resource-list').scrollTop };
    selectedId = id;
    syncRows();
    swapDetail(detail(resource), userInitiated);
    $('selection-status').textContent = '已选择：' + resource.title;
    if (smallScreen.matches && userInitiated) enterMobile();
  }

  function enterMobile() {
    if (!origin) origin = { id: selectedId, windowY: window.scrollY, listY: $('resource-list').scrollTop };
    $('workspace').classList.add('mobile-detail-active');
    // The detail replaces the mobile list at the same module location.
    // Use one intentional, immediate reposition, then restore it on return.
    const top = $('workspace').getBoundingClientRect().top + window.scrollY - 78;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    $('return-button').focus({ preventScroll: true });
  }

  function returnToList() {
    if (!selectedId) return;
    const previous = origin || { id: selectedId, windowY: window.scrollY, listY: $('resource-list').scrollTop };
    selectedId = null;
    syncRows();
    $('workspace').classList.remove('mobile-detail-active');
    swapDetail(placeholder(), true);
    $('resource-list').scrollTop = previous.listY;
    window.scrollTo({ top: previous.windowY, behavior: 'instant' });
    const target = rows.get(previous.id);
    if (target && !target.hidden) target.focus({ preventScroll: true });
    else $('search').focus({ preventScroll: true });
    $('selection-status').textContent = '已返回列表，筛选与列表位置已保留。';
    origin = null;
  }

  function applyFilters() {
    if (!loaded) return;
    visibleIds = core.filterResources(resources, filters(), []).map(resource => resource.id);
    const visible = new Set(visibleIds);
    rows.forEach((row, id) => { row.hidden = !visible.has(id); });
    $('result-count').textContent = visibleIds.length + ' 份资料' + (visibleIds.length !== resources.length ? ' / 共 ' + resources.length + ' 份' : '');
    $('list-empty').hidden = visibleIds.length > 0;
    $('resource-list').hidden = visibleIds.length === 0;
    if (selectedId && !visible.has(selectedId)) {
      selectedId = null;
      origin = null;
      $('workspace').classList.remove('mobile-detail-active');
      swapDetail(placeholder(visibleIds.length ? '所选资料不在当前筛选中。' : '暂时没有匹配的资料。'), true);
      $('selection-status').textContent = '已清除详情选择；原资料不在当前筛选中。';
    } else if (!selectedId) {
      swapDetail(placeholder(visibleIds.length ? undefined : '暂时没有匹配的资料。'), false);
    }
    syncRows();
  }

  function createRows() {
    const fragment = document.createDocumentFragment();
    resources.forEach(resource => {
      const button = el('button', 'resource-row');
      button.type = 'button';
      button.dataset.resourceId = resource.id;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-controls', 'detail-frame');
      const meta = el('span', 'row-meta');
      meta.append(el('span', '', core.labels.sourceType[resource.sourceType] || '公开资料'), el('span', 'dot'), el('span', '', resource.provider));
      const arrow = el('span', 'row-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      button.append(meta, el('span', 'row-title', resource.title), arrow);
      rows.set(resource.id, button);
      fragment.append(button);
    });
    $('resource-list').replaceChildren(fragment);
  }

  async function load() {
    $('load-error').hidden = true;
    $('result-count').textContent = '正在读取资料…';
    try {
      const response = await fetch(new URL('../data/catalog.json', document.currentScript?.src || new URL('./assets/preview.js', document.baseURI)), { cache: 'no-cache' });
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      resources = core.normalizeCatalog(data).resources;
      if (!resources.length) throw new Error('No valid records');
      rows.clear();
      createRows();
      loaded = true;
      applyFilters();
      if (!smallScreen.matches) selectResource(visibleIds[0], false);
    } catch {
      loaded = false;
      $('load-error').hidden = false;
      $('result-count').textContent = '资料读取失败';
      swapDetail(placeholder('资料暂时无法读取。'), false);
    }
  }

  $('filters').addEventListener('submit', event => event.preventDefault());
  $('search').addEventListener('input', applyFilters);
  $('source-filter').addEventListener('change', applyFilters);
  $('skill-filter').addEventListener('change', applyFilters);
  function reset() { $('filters').reset(); applyFilters(); }
  $('reset-filters').addEventListener('click', reset);
  $('empty-reset').addEventListener('click', reset);
  $('return-button').addEventListener('click', returnToList);
  $('retry').addEventListener('click', load);
  $('resource-list').addEventListener('click', event => {
    const row = event.target.closest('[data-resource-id]');
    if (row) selectResource(row.dataset.resourceId);
  });
  $('resource-list').addEventListener('keydown', event => {
    const row = event.target.closest('[data-resource-id]');
    if (!row || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = visibleIds.indexOf(row.dataset.resourceId);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleIds.length - 1 : Math.max(0, Math.min(visibleIds.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    rows.get(visibleIds[next])?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selectedId) { event.preventDefault(); returnToList(); }
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      $('search').focus();
    }
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) cancelTransitions(); });
  smallScreen.addEventListener('change', () => {
    if (!smallScreen.matches) $('workspace').classList.remove('mobile-detail-active');
    fitWorkspaceToViewport();
  });
  window.addEventListener('resize', fitWorkspaceToViewport);
  if (typeof ResizeObserver === 'function') {
    const layoutObserver = new ResizeObserver(fitWorkspaceToViewport);
    ['header-shell', 'module-intro', 'filters', 'results-toolbar'].forEach(id => layoutObserver.observe($(id)));
  }
  if (document.fonts?.ready) document.fonts.ready.then(fitWorkspaceToViewport);
  fitWorkspaceToViewport();
  swapDetail(placeholder('正在准备资料。'), false);
  load();
})();
