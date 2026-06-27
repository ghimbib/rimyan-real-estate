const MATRIX_IDX_URL = 'https://ppmls.mlsmatrix.com/Matrix/public/IDX.aspx?idx=1d51306';

const RIMYAN_CONFIG = {
  leadEmail: 'bibek@rimyan.com',
  phoneDisplay: '281-910-8744',
  phoneHref: 'tel:+12819108744',
  connectors: {
    // Paste the dedicated Matrix "Search" Activation URL here once that IDX config exists.
    idxAdvancedSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "Map Search" Activation URL here once that IDX config exists.
    idxMapSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "My Listings" Activation URL here once that IDX config exists.
    idxMyListings: '',
    // Backward-compatible alias for older featured-listing connector naming.
    featuredListings: '',
    valuation: '',
    marketReports: '',
    crmLeadWebhook: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const mobileCta = document.getElementById('mobileCta');
  const toast = document.getElementById('toast');
  const sourceContext = document.getElementById('sourceContext');

  hydrateContactConfig();
  hydrateIdxConnectors();
  hydrateValuationGauge();

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMobileNav());
    });
  }

  document.querySelectorAll('a[href^="#"], button[data-scroll]').forEach((el) => {
    el.addEventListener('click', (event) => {
      const selector = el.getAttribute('href') || el.dataset.scroll;
      if (!selector || selector === '#') return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      closeMobileNav();
      if (el.dataset.context) setLeadContext(el.dataset.context);
      if (el.dataset.interest) prefillContact({ interest: el.dataset.interest });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (selector === '#contact') focusContactHeading();
    });
  });

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
    if (mobileCta) mobileCta.classList.toggle('visible', window.scrollY > 520);
  }, { passive: true });

  const propertySearchForm = document.getElementById('propertySearchForm');
  if (propertySearchForm) {
    wireQuickFilters(propertySearchForm);
    propertySearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const search = buildPropertySearch(propertySearchForm);
      setLeadContext(search.context);
      prefillContact({ interest: 'Buying', message: 'Search request — ' + search.context });
      showIdxSearchBridge(search);
      const listings = document.getElementById('listings');
      if (RIMYAN_CONFIG.connectors.idxMapSearch && listings) {
        showToast('MLS search opened below. Matrix will show live listings; your selected criteria are saved here for follow-up.');
        listings.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      showToast('Got it. Add your contact details below and I’ll send matching homes worth your time.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      focusContactHeading();
    });
  }

  const valuationForm = document.getElementById('valuationForm');
  if (valuationForm) {
    valuationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(valuationForm);
      const address = data.get('address') || 'Address not provided';
      const email = data.get('email') || 'Email not provided';
      setLeadContext(`Seller valuation request: ${address} | Email: ${email}`);
      prefillContact({ email, interest: 'Selling', message: `I would like a home valuation for: ${address}` });
      showToast('Got it. Confirm below and I’ll send back a real pricing read — comps, competition, and net.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      focusContactHeading();
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      const name = contactForm.querySelector('[name="name"]')?.value || 'Rimyan lead';
      const interest = contactForm.querySelector('[name="interest"]')?.value || 'General';
      const subject = contactForm.querySelector('[name="_subject"]');
      if (subject) subject.value = `Rimyan lead: ${name} — ${interest}`;
      const submit = document.getElementById('submitBtn');
      if (submit) {
        submit.textContent = 'Sending...';
        submit.disabled = true;
      }
    });
  }

  function closeMobileNav() {
    if (!links || !toggle) return;
    links.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function focusContactHeading() {
    const h = document.querySelector('#contact h2');
    if (h) window.setTimeout(() => h.focus({ preventScroll: true }), 480);
  }

  function wireQuickFilters(form) {
    const linkedFilters = document.querySelectorAll(`input[name="filters"][form="${form.id}"]`);
    const priceSelect = form.elements.price;
    linkedFilters.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.value === 'Under $500k' && checkbox.checked && priceSelect) {
          setSelectValue(priceSelect, 'Up to $500k');
        }
      });
    });
    if (priceSelect) {
      priceSelect.addEventListener('change', () => {
        const under500 = Array.from(linkedFilters).find((item) => item.value === 'Under $500k');
        if (under500 && priceSelect.value !== 'Up to $500k') under500.checked = false;
      });
    }
  }

  function buildPropertySearch(form) {
    const data = new FormData(form);
    const location = String(data.get('location') || '').trim() || 'Colorado Springs area';
    const beds = String(data.get('beds') || 'Any');
    let price = String(data.get('price') || 'Any price');
    const type = String(data.get('type') || 'All types');
    const filters = data.getAll('filters').map((item) => String(item)).filter(Boolean);
    if (filters.includes('Under $500k') && price === 'Any price') {
      setSelectValue(form.elements.price, 'Up to $500k');
      price = 'Up to $500k';
    }

    const criteria = [
      `Location: ${location}`,
      beds && beds !== 'Any' ? `Beds: ${beds}` : '',
      price && !/Any/.test(price) ? `Price: ${price}` : '',
      type && !/All/.test(type) ? `Type: ${type}` : '',
      filters.length ? `Quick filters: ${filters.join(', ')}` : ''
    ].filter(Boolean);

    const context = [
      `Buyer MLS search: ${location}`,
      beds && beds !== 'Any' ? `${beds} beds` : '',
      price && !/Any/.test(price) ? price : '',
      type && !/All/.test(type) ? type : '',
      filters.length ? `Filters: ${filters.join(', ')}` : ''
    ].filter(Boolean).join(' · ');

    return {
      location,
      criteria,
      context,
      matrixUrl: RIMYAN_CONFIG.connectors.idxAdvancedSearch || RIMYAN_CONFIG.connectors.idxMapSearch || MATRIX_IDX_URL
    };
  }

  function showIdxSearchBridge(search) {
    const bridge = document.getElementById('idxSearchBridge');
    if (!bridge) return;
    const title = document.getElementById('idxBridgeTitle');
    const summary = document.getElementById('idxBridgeSummary');
    const criteriaList = document.getElementById('idxBridgeCriteria');
    const openLink = document.getElementById('idxBridgeOpen');
    const copyButton = document.getElementById('idxBridgeCopy');
    const idxTitle = document.getElementById('idxToolTitle');
    const idxStatus = document.getElementById('idxToolStatus');

    bridge.hidden = false;
    if (title) title.textContent = `MLS search: ${search.location}`;
    if (summary) {
      summary.textContent = 'Matrix opens the approved live MLS search. Your selected criteria are saved here so you can copy them into Matrix or send them to me.';
    }
    if (criteriaList) {
      criteriaList.replaceChildren();
      search.criteria.forEach((criterion) => {
        const item = document.createElement('li');
        item.textContent = criterion;
        criteriaList.appendChild(item);
      });
    }
    setExternalLink(openLink, search.matrixUrl);
    if (idxTitle) idxTitle.textContent = 'Live MLS search';
    if (idxStatus) idxStatus.textContent = 'Selected criteria captured';
    if (copyButton) {
      copyButton.onclick = () => copySearchCriteria(search);
    }
  }

  async function copySearchCriteria(search) {
    const text = search.criteria.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Search criteria copied. Paste them into Matrix or send them to me.');
    } catch (error) {
      prefillContact({ interest: 'Buying', message: 'Search request — ' + search.context });
      showToast('Criteria saved in the contact form below.');
    }
  }

  function setSelectValue(select, target) {
    if (!select) return;
    const match = Array.from(select.options).find((option) => option.value === target || option.textContent === target);
    if (match) select.value = match.value;
  }

  function hydrateContactConfig() {
    const emailLink = document.getElementById('emailLink');
    if (emailLink) {
      emailLink.href = `mailto:${RIMYAN_CONFIG.leadEmail}`;
      const value = emailLink.querySelector('.val');
      if (value) value.textContent = RIMYAN_CONFIG.leadEmail;
    }

    const phoneLink = document.getElementById('phoneLink');
    if (phoneLink) {
      phoneLink.href = RIMYAN_CONFIG.phoneHref;
      const value = phoneLink.querySelector('.val');
      if (value) value.textContent = RIMYAN_CONFIG.phoneDisplay;
    }
    const mobilePhoneLink = document.getElementById('mobilePhoneLink');
    if (mobilePhoneLink) mobilePhoneLink.href = RIMYAN_CONFIG.phoneHref;
  }

  function hydrateIdxConnectors() {
    const connectors = RIMYAN_CONFIG.connectors;
    const mapUrl = connectors.idxMapSearch || connectors.idxAdvancedSearch;
    const searchUrl = connectors.idxAdvancedSearch || connectors.idxMapSearch;
    const listingsUrl = connectors.idxMyListings || connectors.featuredListings;
    const idxFrame = document.getElementById('idxMapFrame');
    const idxLink = document.getElementById('idxMapLink');
    const searchLink = document.getElementById('idxSearchLink');
    const frameFallbackLink = document.getElementById('idxFrameFallbackLink');
    const listingsLink = document.getElementById('idxListingsLink');
    const idxTitle = document.getElementById('idxToolTitle');
    const idxStatus = document.getElementById('idxToolStatus');

    setExternalLink(idxLink, mapUrl);
    setExternalLink(searchLink, searchUrl);
    setExternalLink(frameFallbackLink, searchUrl || mapUrl);

    if (idxFrame && mapUrl) idxFrame.src = mapUrl;
    if (idxStatus) idxStatus.textContent = getMapStatus(mapUrl, searchUrl);

    if (listingsLink) {
      if (listingsUrl) {
        setExternalLink(listingsLink, listingsUrl);
        listingsLink.textContent = 'My Listings';
        listingsLink.dataset.context = '';
        listingsLink.dataset.interest = '';
        listingsLink.removeAttribute('data-scroll');
      } else {
        listingsLink.href = '#contact';
        listingsLink.removeAttribute('target');
        listingsLink.removeAttribute('rel');
        listingsLink.dataset.scroll = '#contact';
        listingsLink.dataset.context = "IDX: wants Bibek's current listings";
        listingsLink.dataset.interest = 'Buying';
      }
    }

    document.querySelectorAll('[data-idx-tool="map"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!idxFrame || !mapUrl) return;
        idxFrame.src = mapUrl;
        if (idxTitle) idxTitle.textContent = 'Interactive map search';
        if (idxStatus) idxStatus.textContent = getMapStatus(mapUrl, searchUrl);
        document.querySelectorAll('[data-idx-tool]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
      });
    });
  }

  function setExternalLink(link, url) {
    if (!link || !url) return;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function getMapStatus(mapUrl, searchUrl) {
    return mapUrl && searchUrl && mapUrl !== searchUrl ? 'Dedicated Matrix map search' : 'Live Matrix IDX';
  }

  function hydrateValuationGauge() {
    const gauge = document.getElementById('valuationGauge');
    const valueEl = document.getElementById('valuationGaugeValue');
    const progress = document.getElementById('valuationGaugeProgress');
    if (!gauge || !valueEl || !progress) return;

    const min = Number(gauge.dataset.min) || 200000;
    const max = Number(gauge.dataset.max) || 2000000;
    const step = Number(gauge.dataset.step) || 25000;
    const radius = Number(progress.getAttribute('r')) || 84;
    const circumference = 2 * Math.PI * radius;
    const minArc = circumference * 0.16;
    const maxArc = circumference * 0.84;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = clampValue(650000, min, max);
    let frameId = null;
    let intervalId = null;

    setGauge(current);
    if (reduceMotion) return;

    startGaugeLoop();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopGaugeLoop();
        return;
      }
      startGaugeLoop();
    });

    function startGaugeLoop() {
      stopGaugeLoop();
      intervalId = window.setInterval(() => {
        animateGaugeTo(getRandomGaugeValue(current));
      }, 1900);
    }

    function stopGaugeLoop() {
      window.clearInterval(intervalId);
      window.cancelAnimationFrame(frameId);
    }

    function animateGaugeTo(target) {
      const start = current;
      const startedAt = performance.now();
      const duration = 760;
      window.cancelAnimationFrame(frameId);

      const tick = (now) => {
        const progressRatio = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progressRatio, 3);
        const value = start + ((target - start) * eased);
        setGauge(value);
        if (progressRatio < 1) {
          frameId = window.requestAnimationFrame(tick);
          return;
        }
        current = target;
        setGauge(current);
      };

      frameId = window.requestAnimationFrame(tick);
    }

    function setGauge(value) {
      const clamped = clampValue(value, min, max);
      const ratio = (clamped - min) / (max - min);
      const arc = minArc + ((maxArc - minArc) * ratio);
      progress.style.strokeDasharray = `${arc.toFixed(1)} ${circumference.toFixed(1)}`;
      valueEl.textContent = formatGaugeValue(clamped);
    }

    function getRandomGaugeValue(previous) {
      const steps = Math.floor((max - min) / step);
      let next = previous;
      let attempts = 0;
      while (Math.abs(next - previous) < 125000 && attempts < 8) {
        next = min + (Math.floor(Math.random() * (steps + 1)) * step);
        attempts += 1;
      }
      return clampValue(next, min, max);
    }
  }

  function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatGaugeValue(value) {
    const rounded = Math.round(value / 1000) * 1000;
    if (rounded >= 1000000) {
      const precision = rounded % 1000000 === 0 ? 0 : (rounded % 100000 === 0 ? 1 : 2);
      return `$${(rounded / 1000000).toFixed(precision)}M`;
    }
    return `$${Math.round(rounded / 1000)}K`;
  }

  function setLeadContext(value) {
    if (sourceContext) sourceContext.value = value;
  }

  function prefillContact({ email, interest, message }) {
    const form = document.getElementById('contactForm');
    if (!form) return;
    if (email && email !== 'Email not provided') form.querySelector('[name="email"]').value = email;
    if (interest) form.querySelector('[name="interest"]').value = interest;
    if (message) form.querySelector('[name="message"]').value = message;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 4200);
  }
});
