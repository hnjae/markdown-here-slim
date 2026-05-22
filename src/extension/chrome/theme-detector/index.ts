// SPDX-FileCopyrightText: 2026 KIM Hyunjae
// SPDX-License-Identifier: AGPL-3.0-or-later

declare const chrome: {
  runtime: {
    sendMessage(message: { action: string; scheme: "dark" | "light" }): void;
  };
};

const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function sendToolbarTheme() {
  chrome.runtime.sendMessage({
    action: "toolbar-theme-change",
    scheme: darkSchemeQuery.matches ? "dark" : "light",
  });
}

darkSchemeQuery.addEventListener("change", sendToolbarTheme);
sendToolbarTheme();
