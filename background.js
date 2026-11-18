// Auto Account for GitLab — keeps one saved session per gitlab.com account and
// swaps them so each link opens with the account that can access it.

const HOST = 'gitlab.com';
const ORIGIN = 'https://gitlab.com';
const SESSION_COOKIE = '_gitlab_session';

// Cloudflare cookies belong to the browser, not the account.
const SKIP_COOKIE = /^(__cf|cf_|_cfuvid)/;

// First path segments that are GitLab pages, not a group/user namespace.
const RESERVED = new Set([
  '-', 'admin', 'api', 'assets', 'dashboard', 'explore', 'groups', 'help',
  'import', 'jwt', 'oauth', 'profile', 'projects', 'public', 'search',
  'snippets', 'uploads', 'users', 'v2', 'favicon.ico', 'robots.txt',
]);

// tabId -> { ns, origin, tried:Set, switched, t } while a 404 is being retried
const pending = new Map();

const getState = () =>
  chrome.storage.local.get({ accounts: {}, rules: {}, active: null, awaitingNew: false });

// Serialise cookie swaps: two tabs must never interleave them.
let chain = Promise.resolve();
function locked(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

function namespaceOf(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return null; }
  if (u.hostname !== HOST) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0].toLowerCase();
  if (first === 'groups') {
    const g = (parts[1] || '').toLowerCase();
    return g && g !== '-' && g !== 'new' ? g : null;
  }
  return RESERVED.has(first) ? null : first;
}

// Username of the signed-in session, or null when signed out / unknown.
async function whoamiApi() {
  try {
    const r = await fetch(ORIGIN + '/api/v4/user', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).username || null;
  } catch {
    return null;
  }
}

async function accountCookies() {
  const all = await chrome.cookies.getAll({ domain: HOST });
  return all.filter(
    (c) => (c.domain === HOST || c.domain === '.' + HOST) && !SKIP_COOKIE.test(c.name)
  );
}

const cookieUrl = (c) => 'https://' + c.domain.replace(/^\./, '') + c.path;

// Which saved account the browser is signed in as right now (null if none).
async function identify() {
  const st = await getState();
  const cur = await chrome.cookies.get({ url: ORIGIN, name: SESSION_COOKIE });
  if (!cur) return null;
  for (const [name, acc] of Object.entries(st.accounts)) {
    if (acc.cookies.some((k) => k.name === SESSION_COOKIE && k.value === cur.value)) return name;
  }
  // Session cookie changed (fresh sign-in): fall back to asking GitLab.
  const user = await whoamiApi();
  if (user) {
    for (const [name, acc] of Object.entries(st.accounts)) {
      if (name === user || acc.username === user) return name;
    }
  }
  return null;
}

async function snapshot(name, username) {
  const st = await getState();
  const prev = st.accounts[name] || {};
  st.accounts[name] = {
    username: username || prev.username || name,
    cookies: await accountCookies(),
    savedAt: Date.now(),
  };
  await chrome.storage.local.set({ accounts: st.accounts });
}

async function clearCookies() {
  for (const c of await accountCookies()) {
    const d = { url: cookieUrl(c), name: c.name };
    if (c.partitionKey) d.partitionKey = c.partitionKey;
    try { await chrome.cookies.remove(d); } catch {}
  }
}

async function restore(name) {
  const st = await getState();
  const acc = st.accounts[name];
  if (!acc) return;
  const now = Date.now() / 1000;
  for (const c of acc.cookies) {
    if (!c.session && c.expirationDate && c.expirationDate < now) continue;
    const d = {
      url: cookieUrl(c), name: c.name, value: c.value, path: c.path,
      secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
    };
    if (!c.hostOnly) d.domain = c.domain;
    if (!c.session && c.expirationDate) d.expirationDate = c.expirationDate;
    if (c.partitionKey) d.partitionKey = c.partitionKey;
    try { await chrome.cookies.set(d); } catch {}
  }
}

async function setActive(name) {
  await chrome.storage.local.set({ active: name });
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#6b4fbb' });
    await chrome.action.setBadgeText({ text: name ? name.slice(0, 2).toUpperCase() : '' });
    await chrome.action.setTitle({ title: name ? 'GitLab: ' + name : 'Auto Account for GitLab' });
  } catch {}
}

function switchTo(name) {
  return locked(async () => {
    const st = await getState();
    if (!st.accounts[name]) return false;
    const cur = await identify();
    if (cur === name) { await setActive(name); return true; }
    if (cur) await snapshot(cur); // keep the outgoing session fresh
    await clearCookies();
    await restore(name);
    await setActive(name);
    return true;
  });
}

// --- A link whose namespace already has a rule: switch before it loads -------
chrome.webNavigation.onBeforeNavigate.addListener(
  async (d) => {
    if (d.frameId !== 0) return;
    const ns = namespaceOf(d.url);
    if (!ns) return;
    const st = await getState();
    const target = st.rules[ns];
    if (!target || !st.accounts[target] || st.active === target) return;
    if (await switchTo(target)) chrome.tabs.update(d.tabId, { url: d.url });
  },
  { url: [{ hostEquals: HOST }] }
);

// --- A page that answers 404: try the other accounts, remember what works ----
async function handle404(d) {
  const ns = namespaceOf(d.url);
  if (!ns) return;
  const st = await getState();
  const names = Object.keys(st.accounts);
  if (names.length < 2) return;

  const me = await identify();
  if (me && me !== st.active) await setActive(me);
  if (st.rules[ns] && st.rules[ns] === me) { pending.delete(d.tabId); return; } // real 404

  let p = pending.get(d.tabId);
  if (!p || p.ns !== ns || Date.now() - p.t > 30000) {
    p = { ns, origin: me, tried: new Set(), switched: false, t: Date.now() };
    pending.set(d.tabId, p);
  }
  if (me) p.tried.add(me);

  const next = [st.rules[ns], ...names].find((n) => n && st.accounts[n] && !p.tried.has(n));
  if (!next) {
    // Nobody can open it: put the starting account back.
    pending.delete(d.tabId);
    if (p.origin && p.origin !== me) await switchTo(p.origin);
    return;
  }
  p.tried.add(next);
  p.switched = true;
  if (await switchTo(next)) chrome.tabs.update(d.tabId, { url: d.url });
}

async function handleSuccess(d) {
  const st = await getState();

  // "Add another account" flow: save the new sign-in automatically.
  if (st.awaitingNew && !new URL(d.url).pathname.startsWith('/users/')) {
    const user = await whoamiApi();
    if (user) {
      await snapshot(user, user);
      await chrome.storage.local.set({ awaitingNew: false });
      await setActive(user);
    }
  }

  const p = pending.get(d.tabId);
  if (!p) return;
  pending.delete(d.tabId);
  if (!p.switched || namespaceOf(d.url) !== p.ns) return;
  const me = await identify();
  if (!me) return;
  const fresh = await getState();
  fresh.rules[p.ns] = me;
  await chrome.storage.local.set({ rules: fresh.rules });
}

chrome.webRequest.onCompleted.addListener(
  (d) => {
    if (d.tabId < 0 || d.method !== 'GET') return;
    if (d.statusCode === 404) handle404(d);
    else if (d.statusCode >= 200 && d.statusCode < 300) handleSuccess(d);
  },
  { urls: [ORIGIN + '/*'], types: ['main_frame'] }
);

chrome.tabs.onRemoved.addListener((id) => pending.delete(id));

// --- Popup commands ---------------------------------------------------------
const commands = {
  async state() {
    const me = await identify();
    const st = await getState();
    if (me !== st.active) await setActive(me);
    if (me) await locked(() => snapshot(me)); // refresh while we are here
    const signedIn = me || (await whoamiApi());
    return {
      active: me,
      unsaved: me ? null : signedIn,
      awaitingNew: st.awaitingNew,
      accounts: Object.entries(st.accounts).map(([name, a]) => ({ name, savedAt: a.savedAt })),
      rules: st.rules,
    };
  },
  async save({ name }) {
    const user = await whoamiApi();
    const key = user || (name || '').trim();
    if (!key) return { needName: true };
    await locked(() => snapshot(key, user));
    await chrome.storage.local.set({ awaitingNew: false });
    await setActive(key);
    return { ok: true };
  },
  async addAnother() {
    await locked(async () => {
      const cur = await identify();
      if (cur) await snapshot(cur);
      await clearCookies(); // local only — the saved session stays valid
      await chrome.storage.local.set({ awaitingNew: true });
      await setActive(null);
    });
    await chrome.tabs.create({ url: ORIGIN + '/users/sign_in' });
    return { ok: true };
  },
  async switch({ name }) {
    const ok = await switchTo(name);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (ok && tab && tab.url && tab.url.startsWith(ORIGIN)) chrome.tabs.reload(tab.id);
    return { ok };
  },
  async remove({ name }) {
    const st = await getState();
    delete st.accounts[name];
    for (const [ns, acc] of Object.entries(st.rules)) if (acc === name) delete st.rules[ns];
    await chrome.storage.local.set({ accounts: st.accounts, rules: st.rules });
    return { ok: true };
  },
  async setRule({ ns, name }) {
    const key = (ns || '').trim().replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
    if (!key) return { ok: false };
    const st = await getState();
    st.rules[key] = name;
    await chrome.storage.local.set({ rules: st.rules });
    return { ok: true };
  },
  async deleteRule({ ns }) {
    const st = await getState();
    delete st.rules[ns];
    await chrome.storage.local.set({ rules: st.rules });
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const fn = commands[msg && msg.type];
  if (!fn) return false;
  fn(msg).then(reply, (e) => reply({ error: String(e) }));
  return true;
});

// Restore the badge when the browser starts.
getState().then((st) => setActive(st.active));
