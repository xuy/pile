// PileBlock - Cosmetic Filter Content Script
// Handles dynamic ad element hiding that CSS alone can't cover

(function () {
  'use strict';

  // Check if extension is enabled
  let enabled = true;

  chrome.storage?.local?.get('pileblock', (result) => {
    if (result?.pileblock) {
      enabled = result.pileblock.enabled;
    }
  });

  if (!enabled) return;

  // Selectors for elements to remove/hide dynamically
  const DYNAMIC_AD_SELECTORS = [
    // Dynamically inserted ads
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="amazon-adsystem"]',
    'iframe[src*="facebook.com/plugins"]',
    'iframe[id^="google_ads"]',
    'iframe[id^="aswift_"]',
    // Ad-related scripts create these
    'div[id^="google_ads_"]',
    'div[id^="div-gpt-ad"]',
    'ins.adsbygoogle',
    // Taboola/Outbrain widgets
    'div[id^="taboola-"]',
    'div[class*="taboola"]',
    'div[id^="outbrain"]',
    'div.OUTBRAIN',
    // Generic patterns
    'div[class*="ad-placeholder"]',
    'div[class*="ad-loading"]',
    'amp-ad',
    'amp-embed[type="ad"]',
  ];

  const COMBINED_SELECTOR = DYNAMIC_AD_SELECTORS.join(',');

  // Hide matching elements
  function hideAds() {
    try {
      const elements = document.querySelectorAll(COMBINED_SELECTOR);
      for (const el of elements) {
        if (el.dataset.pileblockHidden) continue;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('height', '0', 'important');
        el.style.setProperty('min-height', '0', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.dataset.pileblockHidden = '1';
      }
    } catch (e) {
      // Silently fail - don't break pages
    }
  }

  // Collapse empty ad containers (removes whitespace gaps)
  function collapseEmptyContainers() {
    const empties = document.querySelectorAll(
      '[class*="ad-"]:empty, [id*="ad-"]:empty, [class*="advert"]:empty'
    );
    for (const el of empties) {
      if (el.offsetHeight > 0 && el.offsetHeight < 5) {
        el.style.setProperty('display', 'none', 'important');
      }
    }
  }

  // MutationObserver to catch dynamically inserted ads
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldCheck = true;
        break;
      }
    }
    if (shouldCheck) {
      // Debounce with requestAnimationFrame
      requestAnimationFrame(hideAds);
    }
  });

  // Start observing
  function init() {
    hideAds();

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Run again after page settles
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        hideAds();
        setTimeout(collapseEmptyContainers, 1000);
      });
    } else {
      setTimeout(collapseEmptyContainers, 1000);
    }

    // Final pass after full load
    window.addEventListener('load', () => {
      setTimeout(() => {
        hideAds();
        collapseEmptyContainers();
      }, 2000);
    });
  }

  init();
})();
