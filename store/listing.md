# Store listing

Text for the Chrome Web Store and Microsoft Edge Add-ons, ready to paste. Each block is one field.

## Store listing

**Name** (comes from `manifest.json`)

```
Auto Account for GitLab
```

**Summary** (comes from `manifest.json`, at most 132 characters)

```
Remembers several gitlab.com accounts and opens every link with the account that has access to it.
```

**Category**

```
Developer Tools
```

**Language**

```
English
```

**Description**

```
Work with more than one GitLab account? Then you know this: you click a link and land on a 404. The page isn't gone. You're just signed in as the wrong account. Sign out, sign in, open the link again.

Auto Account for GitLab ends that. Click the link, and the page opens with the account that can see it.

HOW IT WORKS
• Save each of your gitlab.com accounts once. Every one stays signed in, ready to use.
• The first time a link gives a 404, the extension tries your other accounts. The one that opens the page is remembered for that group.
• Next time, it switches straight away. No 404 on the way.
• If none of your accounts can open a page, you go back to the account you started with.
• The toolbar badge always shows which account is in use. One click in the menu switches by hand.

YOUR DATA STAYS WITH YOU
• Your saved accounts stay in your browser, on your computer. Nothing is sent to the developer or anyone else.
• The extension talks only to gitlab.com, to ask which account is signed in. No analytics, no tracking.
• It works only on gitlab.com and can't see any other site.

OPEN SOURCE
The full code is on GitHub: https://github.com/naveed-toro/auto-account-for-gitlab

Works with gitlab.com, not with self-hosted GitLab.

This extension is not affiliated, endorsed, sponsored, or approved with or by GitLab Inc. GitLab is a trademark of GitLab Inc.
```

**Homepage and support**

```
https://github.com/naveed-toro/auto-account-for-gitlab
```

## Privacy practices (Chrome Web Store)

**Single purpose**

```
Switch between saved gitlab.com accounts automatically, so every GitLab link opens with the account that can access it.
```

**Why `cookies`**

```
To save each gitlab.com account's sign-in cookies and swap them when the user switches accounts. Only gitlab.com cookies are read or written.
```

**Why `storage`**

```
To keep the user's saved accounts and the group-to-account rules on the user's own device.
```

**Why `webRequest`**

```
To notice when a gitlab.com page starts loading, so the extension can switch to the account that owns that group, and when it answers 404, so it can try the user's other saved accounts. Only gitlab.com requests are observed. Nothing is blocked or changed.
```

**Why the host permission `https://gitlab.com/*`**

```
The extension works only on gitlab.com. It reads and sets gitlab.com cookies, watches gitlab.com page loads, and asks gitlab.com which account is signed in.
```

**Remote code**

```
No, I am not using remote code.
```

**Data usage.** Tick these two, leave the rest empty:

- **Authentication information**: the saved gitlab.com cookies.
- **Web history**: the names of the gitlab.com groups the extension remembers.

Both stay on the user's device and are never sent anywhere. Tick all three certifications: the data is not sold, not used for anything unrelated to the single purpose, and not used for credit decisions.

**Privacy policy URL**

```
https://github.com/naveed-toro/auto-account-for-gitlab/blob/main/PRIVACY.md
```

## Microsoft Edge Add-ons

Use the same name, description, category and privacy policy URL as above.
