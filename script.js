const MATRIX_IDX_URL = 'https://ppmls.mlsmatrix.com/Matrix/public/IDX.aspx?idx=1d51306';

const RIMYAN_CONFIG = {
  leadEmail: 'bibek@rimyan.com',
  phoneDisplay: '281-910-8744',
  phoneHref: 'tel:+12819108744',
  // FormSubmit AJAX endpoint — delivers form leads to email without a page reload.
  formEndpoint: 'https://formsubmit.co/ajax/bibek@rimyan.com',
  connectors: {
    // Paste the dedicated Matrix "Search" Activation URL here once that IDX config exists.
    idxAdvancedSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "Map Search" Activation URL here once that IDX config exists.
    idxMapSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "My Listings" Activation URL here once that IDX config exists.
    idxMyListings: '',
    // DojoGate CRM inbound lead webhook. Every form submission is mirrored here
    // (fire-and-forget); email delivery is never blocked by it. The key only
    // permits lead creation on this endpoint and can be rotated in DojoGate.
    crmLeadWebhook: 'https://app.dojogate.ai/api/v1/webhooks/inbound/rimyan-website',
    crmApiKey: 'wh_e06c46437c0043357aa4e84c5dc77299'
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

  wireLeadForm({
    formId: 'valuationForm',
    subject: 'Rimyan home valuation request',
    interest: 'Selling',
    context: (data) => `Seller valuation request: ${data.address}`,
    success: 'Got it. I’ll send back a real pricing read — comps, competition, and likely net — usually within one business day.'
  });

  wireLeadForm({
    formId: 'dealForm',
    subject: 'Rimyan deal review request',
    interest: 'Investing',
    context: (data) => `Deal review request: ${data.listing}`,
    success: 'Got it. I’ll run the numbers and reply personally — price vs. comps, monthly cost, and the questions I’d ask.'
  });

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
      // Mirror to the CRM before the page navigates; keepalive lets it finish in-flight.
      sendLeadToCrm({
        name,
        email: contactForm.querySelector('[name="email"]')?.value || '',
        phone: contactForm.querySelector('[name="phone"]')?.value || '',
        interest,
        message: contactForm.querySelector('[name="message"]')?.value || '',
        source_context: sourceContext ? sourceContext.value : 'Direct contact form'
      });
    });
  }

  function wireLeadForm({ formId, subject, interest, context, success }) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());
      const leadContext = context(data);
      setLeadContext(leadContext);
      if (button) {
        button.dataset.label = button.textContent;
        button.textContent = 'Sending...';
        button.disabled = true;
      }

      sendLeadToCrm({ ...data, interest, source_context: leadContext });

      try {
        const response = await fetch(RIMYAN_CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, _subject: subject, _template: 'table', source_context: leadContext })
        });
        if (!response.ok) throw new Error(`FormSubmit ${response.status}`);
        form.reset();
        showToast(success);
      } catch (error) {
        // Email delivery failed — keep the lead by pre-filling the contact form.
        prefillContact({ email: data.email, interest, message: leadContext });
        showToast('Almost there — confirm your details in the contact form below and hit send.');
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        focusContactHeading();
      } finally {
        if (button) {
          button.textContent = button.dataset.label || 'Send';
          button.disabled = false;
        }
      }
    });
  }

  function sendLeadToCrm(lead) {
    const url = RIMYAN_CONFIG.connectors.crmLeadWebhook;
    if (!url) return;
    const [firstName, ...rest] = String(lead.name || '').trim().split(/\s+/);
    const payload = {
      first_name: firstName || 'Website',
      last_name: rest.join(' ') || 'Lead',
      email: lead.email || '',
      phone: lead.phone || '',
      message: [lead.message, lead.address && `Address: ${lead.address}`, lead.listing && `Listing: ${lead.listing}`]
        .filter(Boolean).join('\n'),
      source: 'rimyan.com',
      source_context: lead.source_context || '',
      interest: lead.interest || ''
    };
    const headers = { 'Content-Type': 'application/json' };
    if (RIMYAN_CONFIG.connectors.crmApiKey) headers['x-api-key'] = RIMYAN_CONFIG.connectors.crmApiKey;
    fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), keepalive: true })
      .catch(() => { /* CRM mirror is best-effort; email is the source of truth. */ });
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
    const listingsUrl = connectors.idxMyListings;
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

    if (listingsLink && listingsUrl) {
      setExternalLink(listingsLink, listingsUrl);
      listingsLink.textContent = 'My Listings';
      listingsLink.dataset.context = '';
      listingsLink.dataset.interest = '';
      listingsLink.removeAttribute('data-scroll');
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

  function setLeadContext(value) {
    if (sourceContext) sourceContext.value = value;
  }

  function prefillContact({ email, interest, message }) {
    const form = document.getElementById('contactForm');
    if (!form) return;
    if (email) form.querySelector('[name="email"]').value = email;
    if (interest) setSelectValue(form.querySelector('[name="interest"]'), interest);
    if (message) form.querySelector('[name="message"]').value = message;
  }

  function setSelectValue(select, target) {
    if (!select) return;
    const match = Array.from(select.options).find((option) => option.value === target || option.textContent === target);
    if (match) select.value = match.value;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 5200);
  }
});
