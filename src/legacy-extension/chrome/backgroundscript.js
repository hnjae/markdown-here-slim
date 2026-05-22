/*
 * Copyright Adam Pritchard 2016
 * MIT License : https://adampritchard.mit-license.org/
 */

/*global chrome:false, OptionsStore:false, MarkdownRender:false,
  marked:false, hljs:false, Utils:false, CommonLogic:false, ContentPermissions:false */
/*jshint devel:true, browser:true*/

if (typeof browser === "undefined") {
  // Chrome does not support the browser namespace yet.
  // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
  globalThis.browser = chrome;
}

// We supply a #hash to the background page, so that we know when we're
// loaded via `background.page` (manifest V2 and Firefox manifest V3) vs
// `background.service_worker` (manifest V3 in Chrome).
var backgroundPage = !!location.hash;

const actionApi = chrome.action || chrome.browserAction;
const composeActionApi = chrome.composeAction;
const menuApi = chrome.contextMenus || chrome.menus;
const themeDetectorPath = "chrome/theme-detector.html";
const toolbarIconPaths = {
  dark: {
    16: "common/images/icon16-button-monochrome.png",
    19: "common/images/icon19-button-monochrome.png",
    32: "common/images/icon32-button-monochrome.png",
    38: "common/images/icon38-button-monochrome.png",
    64: "common/images/icon64-button-monochrome.png",
  },
  light: {
    16: "common/images/icon16-button-light.png",
    19: "common/images/icon19-button-light.png",
    32: "common/images/icon32-button-light.png",
    38: "common/images/icon38-button-light.png",
    64: "common/images/icon64-button-light.png",
  },
};
let creatingThemeDetector;

if (!backgroundPage) {
  // When loaded via a background page, the support scripts are already
  // present. When loaded via a service worker, we need to import them.
  // (`importScripts` is only available in service workers.)
  importScripts("../common/vendor/dompurify.min.js");
  importScripts("../common/utils.js");
  importScripts("../common/common-logic.js");
  importScripts("../common/marked.js");
  importScripts("../common/highlightjs/highlight.js");
  importScripts("../common/markdown-render.js");
  importScripts("../common/options-store.js");
  importScripts("../common/content-permissions.js");
}

// Note that this file is both the script for a background page _and_ for a service
// worker. The way these things work are quite different, and we must be cognizant of that
// while writing this file.
//
// The key difference is that a background page is loaded once per browser session; a
// service worker is loaded when extension-related events occur, and then is torn down
// after 30 seconds of inactivity (with lifecycle caveats). This means that we can't rely
// on global variables to store state, and we must be mindful about how we handle
// messages.

// For the background page, this listener is added once and remains active for the browser
// session; for the service worker, this listener is added every time the service worker
// is loaded, and is torn down when the service worker is torn down.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update") {
    return;
  }

  // Create the context menu that will signal our main code.
  // This must be called only once, when installed or updated, so we do it here.
  menuApi.create({
    id: "markdown-here-context-menu",
    contexts: ["editable"],
    title: Utils.getMessage("context_menu_item"),
  });
});

// Handle context menu clicks.
menuApi.onClicked.addListener(async (info, tab) => {
  await handleActionClick(tab, info);
});

// Handle rendering requests from the content script. Note that incoming messages will
// revive the service worker, then process the message, then tear down the service worker.
// See the comment in markdown-render.js for why we use these requests.
chrome.runtime.onMessage.addListener((request, sender, responseCallback) => {
  if (request.action === "toolbar-theme-change") {
    if (sender.url === Utils.getLocalURL(`/${themeDetectorPath}`)) {
      updateToolbarIconForColorScheme(request.scheme);
    }
    return false;
  }

  // The content script can load in a not-real tab (like the search box), which
  // has an invalid `sender.tab` value. We should just ignore these pages.
  if (
    typeof sender.tab === "undefined" ||
    typeof sender.tab.id === "undefined" ||
    sender.tab.id < 0
  ) {
    return false;
  }

  if (request.action === "render") {
    OptionsStore.get((prefs) => {
      responseCallback({
        html: MarkdownRender.markdownRender(
          request.mdText,
          prefs,
          marked,
          hljs,
        ),
        css: prefs["main-css"] + prefs["syntax-css"],
      });
    });
    return true;
  } else if (request.action === "get-options") {
    OptionsStore.get((prefs) => {
      responseCallback(prefs);
    });
    return true;
  } else if (request.action === "get-forgot-to-render-prompt") {
    CommonLogic.getForgotToRenderPromptContent((html) => {
      responseCallback({ html: html });
    });
    return true;
  } else if (request.action === "open-tab") {
    chrome.tabs.create({
      url: request.url,
    });
    return false;
  } else if (request.action === "test-request") {
    responseCallback("test-request-good");
    return false;
  } else {
    throw `unmatched request action: ${request.action}`;
  }
});

setupToolbarThemeDetection();

// Add the browserAction (the button in the browser toolbar) listener.
// This also handles the _execute_action keyboard command automatically.
actionApi.onClicked.addListener(async (tab) => {
  await handleActionClick(tab);
});

if (composeActionApi) {
  composeActionApi.onClicked.addListener(async (tab) => {
    await handleActionClick(tab);
  });
}

function updateToolbarIconForColorScheme(scheme) {
  if (!chrome.action?.setIcon) {
    return;
  }

  // A dark color scheme implies a dark toolbar, so use the light icon variant.
  const icon =
    scheme === "dark" ? toolbarIconPaths.light : toolbarIconPaths.dark;
  chrome.action.setIcon({ path: icon });
}

async function setupToolbarThemeDetection() {
  if (
    backgroundPage ||
    !chrome.offscreen?.createDocument ||
    !chrome.runtime.getContexts
  ) {
    return;
  }

  const themeDetectorUrl = Utils.getLocalURL(`/${themeDetectorPath}`);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [themeDetectorUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creatingThemeDetector) {
    await creatingThemeDetector;
    return;
  }

  creatingThemeDetector = chrome.offscreen.createDocument({
    url: themeDetectorPath,
    reasons: ["MATCH_MEDIA"],
    justification:
      "Detect toolbar color scheme to keep the action icon visible.",
  });

  try {
    await creatingThemeDetector;
  } finally {
    creatingThemeDetector = null;
  }
}

async function executeContentScript(tabId, script) {
  if (chrome.scripting?.executeScript && !composeActionApi) {
    return chrome.scripting.executeScript({
      target: { tabId: tabId },
      ...script,
    });
  }

  if (script.func) {
    return chrome.tabs.executeScript(tabId, {
      code: `(${script.func})()`,
    });
  }

  if (script.files) {
    const results = [];

    for (const file of script.files) {
      results.push(
        ...(await chrome.tabs.executeScript(tabId, {
          file: file.replace(/^\//, ""),
        })),
      );
    }

    return results;
  }

  throw new Error("Unsupported script injection request");
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "_execute_action" || !tab) {
    return;
  }

  await handleActionClick(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only proceed when the tab has finished loading and has a valid URL
  if (changeInfo.status === "complete" && tab.url) {
    // Auto-inject scripts for domains where we already have permission.
    // This allows us to run _before_ the user clicks the button, enabling features
    // such as the "forgot to render" prompt.
    try {
      if (await ContentPermissions.hasPermission(tab.url)) {
        await Injector.injectScripts(tabId);
      }
    } catch (_e) {
      // Invalid URL or other error -- just skip
    }
  }
});

// Handle a click on the action button or context menu item
async function handleActionClick(tab, info = undefined) {
  const injected = await Injector.injectScripts(tab.id);

  if (!injected) {
    console.error("Failed to inject scripts");
    return false;
  }

  // Send the toggle message
  chrome.tabs.sendMessage(tab.id, {
    action: "button-click",
    info: info,
  });

  return true;
}

const Injector = {
  // Scripts to inject in order
  CONTENT_SCRIPTS: [
    "/common/vendor/dompurify.min.js",
    "/common/utils.js",
    "/common/common-logic.js",
    "/common/jsHtmlToText.js",
    "/common/marked.js",
    "/common/mdh-html-to-text.js",
    "/common/markdown-here.js",
    "/chrome/contentscript.js",
  ],

  // Check if scripts are already injected in a tab and mark that they are. we do these
  // in one step to minimize the potential for race conditions, where there's an attempt
  // to inject the scripts multiple times.
  async checkAndMarkInjected(tabId) {
    try {
      const results = await executeContentScript(tabId, {
        func: () => {
          const alreadyInjected = window.markdownHereInjected;
          window.markdownHereInjected = true;
          return !!alreadyInjected;
        },
      });
      return results?.[0]?.result === true || results?.[0] === true;
    } catch (_e) {
      // Tab might not be accessible
      return false;
    }
  },

  // Inject content scripts into a tab
  async injectScripts(tabId) {
    try {
      // Check if already injected
      if (await this.checkAndMarkInjected(tabId)) {
        return true;
      }

      // Inject files in order
      for (const script of this.CONTENT_SCRIPTS) {
        await executeContentScript(tabId, {
          files: [script],
        });
      }

      return true;
    } catch (e) {
      // Note that we're not cleaning up our "injected" flag, nor any of the scripts that
      // might have been injected before the error occurred. An error shouldn't occur,
      // and we'll just give up on working in this tab if it does.
      console.error("Error injecting scripts:", e);
      return false;
    }
  },
};
