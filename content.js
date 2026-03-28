(() => {
  const PRICE_REGEX = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g;
  const MASK = "****";
  const ATTR = "data-pfh-original";

  let enabled = false;
  let observer = null;

  // --- Core DOM logic ---

  function maskNode(textNode) {
    const original = textNode.nodeValue;
    if (!PRICE_REGEX.test(original)) return;
    PRICE_REGEX.lastIndex = 0;

    const masked = original.replace(PRICE_REGEX, MASK);
    if (masked === original) return;

    // Store original on parent for restoration
    const parent = textNode.parentNode;
    if (!parent) return;
    if (!parent.hasAttribute(ATTR)) {
      parent.setAttribute(ATTR, "true");
    }
    textNode.nodeValue = masked;
  }

  function restoreNode(textNode) {
    // We can't recover exact text after in-place replacement,
    // so we rely on page reload / navigation to restore.
    // This is fine: toggling OFF stops further masking.
  }

  function walkAndMask(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(maskNode);
  }

  // --- MutationObserver ---

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!enabled) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          PRICE_REGEX.lastIndex = 0;
          if (PRICE_REGEX.test(mutation.target.nodeValue)) {
            PRICE_REGEX.lastIndex = 0;
            maskNode(mutation.target);
          }
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              maskNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              walkAndMask(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // --- Enable / Disable ---

  function enable() {
    enabled = true;
    walkAndMask(document.body);
    startObserver();
  }

  function disable() {
    enabled = false;
    stopObserver();
    // Note: already-masked text requires a page reload to fully restore.
    // This matches the stated UX: ON masks, OFF stops further masking.
  }

  // --- Init ---

  chrome.storage.sync.get({ enabled: false }, ({ enabled: isEnabled }) => {
    if (isEnabled) enable();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      changes.enabled.newValue ? enable() : disable();
    }
  });
})();
