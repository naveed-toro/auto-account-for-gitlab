# Auto Account for GitLab

A Chrome extension that remembers several gitlab.com accounts and opens every link with the account that can see it.

## Why I built it

I work with two GitLab accounts, and different projects belong to different accounts. GitLab lets you be signed in as only one of them at a time. So half the links I opened ended on a 404 page — not because the page was gone, but because I was signed in as the wrong me. Sign out, sign in, open the link again. Many times a day.

Now I just click the link. If it belongs to the other account, the extension switches and the page opens.

## What it does

- **Remembers your accounts.** Each one stays signed in, ready to use.
- **Learns which group belongs to which account.** The first time a link gives a 404, it tries your other accounts. The one that opens the page is remembered for that group.
- **Switches straight away next time.** No 404 on the way.
- **Knows a real 404.** If none of your accounts can open the page, it puts you back on the account you started with.
- **Shows who you are.** The toolbar badge shows the first two letters of the account in use.

## Install

1. Download this repository (**Code → Download ZIP**) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the unzipped folder.

## Use

1. Sign in to GitLab with your first account. Open the extension and click **Save this account**.
2. Click **+ Add another account** and sign in with the next account in the tab that opens. It is saved automatically.
3. That's it. Open GitLab links as usual.

To switch by hand, click **Use** next to an account. To set a rule yourself, type the group (the first part of the address after `gitlab.com/`) under *Which group opens with which account* and pick the account.

## How it works

GitLab keeps you signed in with cookies. The extension keeps a copy of each account's gitlab.com cookies and swaps them when needed. Switching does not sign an account out on GitLab, so every saved session stays valid.

GitLab answers 404 for a private page you can't access. That 404 is the signal to try another account.

## Privacy

- Your cookies stay on your computer, in the extension's local storage. Nothing is sent anywhere.
- The extension talks only to gitlab.com, to ask who is signed in. No analytics, no other servers.
- Saved sessions are stored unencrypted, just like the browser's own cookies. Anyone who can use your browser profile can use them, so don't install it on a shared computer.
- Chrome lists "read your browsing history" for it. That comes from the `tabs` and `webNavigation` permissions, used to notice when a gitlab.com link opens. The code only listens to gitlab.com.

## Limits

- gitlab.com only, not self-hosted GitLab.
- A rule covers a whole group or user (the first part of the address), not a single project.
- If you press **Sign out** in GitLab, that saved session ends. Sign in to the account again and open the extension once — it picks it up.

## Not affiliated with GitLab

This extension is not affiliated, endorsed, sponsored, or approved with or by GitLab Inc. GitLab is a trademark of GitLab Inc.

## License

[MIT](LICENSE)
