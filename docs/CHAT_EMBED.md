# Chat embed on external outlet websites (e.g. Firefly)

Guests stay on **your outlet website** (URL bar unchanged). Chat opens as a **full-screen sheet** with a **5px strip** of your site visible at the top — tap it to close. No new tab, no Bassik branding on the parent page.

## 1. Bassik (one-time)

Add the Firefly site domain to Vercel env:

```env
CHAT_EMBED_ALLOWED_ORIGINS=https://your-firefly-domain.com,https://www.your-firefly-domain.com
```

Redeploy Bassik after setting this.

## 2. Firefly website (copy-paste)

Add before `</body>`:

```html
<script>
  window.BassikChatConfig = {
    brandId: "firefly",
    baseUrl: "https://bassik.in",
    accentColor: "#D97706",
    topGap: 5,
    utmSource: "firefly-website",
  };
</script>
<script src="https://bassik.in/embed/bassik-chat.js" defer></script>
```

That’s it — a chat FAB appears bottom-right. Tapping it slides up the concierge (same AI, same `/leads` inbox).

### Optional API

```javascript
window.BassikChat.open();   // open sheet programmatically
window.BassikChat.close();  // close sheet
window.BassikChat.mount();  // mount FAB if autoMount: false
```

### Custom “Chat” button

```html
<button type="button" onclick="window.BassikChat.open()">Message us</button>
```

Set `autoMount: false` in config if you only want your own button.

## How it feels

| Guest sees | What actually happens |
|------------|------------------------|
| Still on `firefly.com` | Parent page never navigates |
| Thin line of Firefly site at top | Tap = close, back to browsing |
| Full Firefly-branded chat below | Loaded in hidden iframe from `bassik.in/firefly/chat/embed` |
| Booking inside chat | Book flow runs inside the sheet (still on Firefly URL bar) |

## Local testing

1. Run Bassik on `:3000`, Firefly site on `:3001`
2. Dev allows `localhost:3001` by default (no env needed)
3. Point `baseUrl` to `http://localhost:3000` in config while testing

## Embed URL (direct iframe)

If you prefer your own popup shell:

```
https://bassik.in/firefly/chat/embed?utm_source=firefly-site
```

Close from inside chat sends `postMessage({ type: "bassik-chat-close" })` to the parent.
