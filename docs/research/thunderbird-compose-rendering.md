---
updated: 2026-05-22
---

# Thunderbird Compose Rendering 조사

## 요약

프로젝트 목표가 Markdown으로 작성한 메시지를 깨끗한 최종 HTML과 CSS로 전송하는 것이라면 Thunderbird가 가장 적합한 대상이다. Chrome과 Firefox 웹메일 확장은 웹페이지에 스크립트를 주입하고 `contenteditable` DOM을 변경할 수 있지만, Gmail, Fastmail, Outlook 같은 웹메일 클라이언트의 최종 MIME 메시지 본문을 제어하는 브라우저 확장 API는 제공하지 않는다.

기존 Markdown Here 모델은 compose editor DOM 안에 렌더 결과를 삽입하고, 되돌리기를 위해 원본 source를 숨겨진 wrapper 안에 저장한다. 이 방식은 범용 웹메일 toggle 기능에는 유용하지만, 깨끗한 최종 메시지 파이프라인은 아니다. Thunderbird-first 설계에서는 Markdown을 작성 원본으로 유지하고 Thunderbird의 `compose` API를 통해 전송 시점에 compose body를 교체할 수 있다.

## Thunderbird API 조사 결과

Thunderbird MailExtension은 일반 Chrome 또는 Firefox 웹 확장에는 없는 compose 전용 API를 제공한다. 관련 API surface는 `browser.compose`이다.

`browser.compose.getComposeDetails(tabId)`는 compose body와 delivery 설정을 포함한 현재 compose 상태를 읽을 수 있다.

`browser.compose.setComposeDetails(tabId, details)`는 compose field를 갱신할 수 있다. `ComposeDetails.body`는 HTML content이고, `plainTextBody`는 plain-text body이며, `deliveryFormat`은 Thunderbird가 `auto`, `both`, `html`, `plaintext` 중 어떤 형식으로 보낼지 제어한다.

`browser.compose.onBeforeSend`는 send flow를 가로채고 갱신된 compose details를 반환할 수 있다. 따라서 전송 시점 Markdown 파이프라인에 적합하다. Markdown source를 읽고, sanitized HTML을 렌더하고, plain-text fallback을 생성한 뒤 Thunderbird가 메시지를 보내기 전에 갱신된 `details`를 반환할 수 있다.

중요한 제약은 Thunderbird가 이미 열린 compose window의 HTML/plain-text compose format 변경을 허용하지 않는다는 점이다. 따라서 HTML mail을 안정적으로 생성하려면 HTML compose window를 전제로 구현해야 한다.

## 권장 구현 방향

깨끗한 파이프라인은 Thunderbird-first 동작으로 구현한다.

- 작성 원본: 사용자가 작성한 Markdown을 source of truth로 유지한다.
- 렌더 시점: editor DOM에 되돌릴 수 있는 wrapper를 삽입하지 않고 `compose.onBeforeSend`에서 Markdown 렌더링을 수행한다.
- 출력 본문: `details.body`를 email-safe inline CSS가 포함된 sanitized rendered HTML로 설정한다.
- Plain fallback: `details.plainTextBody`를 생성된 plain-text fallback으로 설정한다.
- Delivery format: Thunderbird가 해당 compose 상태에서 지원하는 경우 수신자가 multipart HTML과 plain text를 모두 받을 수 있도록 `deliveryFormat: "both"`를 기본값으로 사용한다.
- Legacy 동작: Chrome/Firefox 웹메일 지원을 유지하더라도 best-effort DOM 삽입으로만 취급한다. 깨끗한 최종 메시지 파이프라인으로 보지 않는다.

이 설계는 Thunderbird path에서 Markdown Here의 wrapper/raw-holder 메커니즘을 피한다. 또한 각 웹메일 애플리케이션의 private DOM에 의존해 취약한 Gmail/Fastmail send-button interception도 피한다.

## Chrome과 Firefox 웹메일의 한계

Chrome과 Firefox extension API는 사용자가 접근을 허용한 뒤 content script를 주입하고 page 안에서 코드를 실행할 수 있다. 하지만 표준 extension model은 웹메일 전반에 적용되는 message-body API를 노출하지 않는다. 웹메일에서 확장이 볼 수 있는 것은 mail client의 최종 MIME payload가 아니라 웹페이지이다.

Gmail은 Gmail API를 통해 더 직접적으로 제어할 수 있으며, Gmail API는 RFC 2822 MIME 메시지 전송을 지원한다. 이 경로는 깨끗한 HTML을 만들 수 있지만 더 이상 범용 웹메일 compose helper가 아니다. Gmail 전용 발송 클라이언트가 되며 OAuth, account handling, draft/reply/thread 동작, attachment, send semantics를 별도로 구현해야 한다.

## 참고 자료

- Thunderbird compose API: <https://webextension-api.thunderbird.net/en/beta-mv3/compose.html>
- Thunderbird 지원 WebExtension API: <https://developer.thunderbird.net/add-ons/mailextensions/supported-webextension-api>
- MDN content scripts: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts>
- Chrome scripting API: <https://developer.chrome.com/docs/extensions/reference/api/scripting>
- Gmail API sending guide: <https://developers.google.com/gmail/api/guides/sending>
