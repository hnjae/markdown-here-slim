/*
 * Copyright Adam Pritchard 2015
 * MIT License : https://adampritchard.mit-license.org/
 */

(function () {
  /*global module:false, Utils:false*/

  function get(callback) {
    Utils.getLocalFile(
      Utils.getLocalURL("/common/default.css"),
      "text",
      (defaultCss) => {
        Utils.getLocalFile(
          Utils.getLocalURL("/common/highlightjs/styles/github.css"),
          "text",
          (githubHighlightCss) => {
            const PRECONFIGURED_OPTIONS = {
              "main-css": defaultCss,
              "syntax-css": githubHighlightCss,
              "math-enabled": false,
              "math-value":
                '<img src="https://latex.codecogs.com/png.image?\\dpi{120}\\inline&space;{urlmathcode}" alt="{mathcode}">',
              "forgot-to-render-check-enabled-2": true,
              "header-anchors-enabled": false,
              "gfm-line-breaks-enabled": true,
            };

            callback(PRECONFIGURED_OPTIONS);
          },
        );
      },
    );
  }

  function callOptionalCallback(callback) {
    if (callback) {
      Utils.nextTick(callback);
    }
  }

  // Use preconfigured options for all WebExtensions platforms.
  this.OptionsStore = {
    get: get,
    set: (_obj, callback) => callOptionalCallback(callback),
    remove: (_arrayOfKeys, callback) => callOptionalCallback(callback),
  };

  var EXPORTED_SYMBOLS = ["OptionsStore"];
  this.EXPORTED_SYMBOLS = EXPORTED_SYMBOLS;
}).call(
  (function () {
    return this || (typeof window !== "undefined" ? window : global);
  })(),
);
