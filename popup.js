const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function el(tag, props, ...kids) {
  const n = Object.assign(document.createElement(tag), props || {});
  n.append(...kids);
  return n;
}

async function render() {
  const s = await send({ type: 'state' });

  // Notice area
  const note = $('note');
  note.replaceChildren();
  if (s.unsaved) {
    note.append(
      el('div', { className: 'note' },
        el('div', {}, 'Signed in as ', el('b', {}, s.unsaved), ' — not saved yet.'),
        el('button', { className: 'primary', onclick: save }, 'Save this account'))
    );
  } else if (s.awaitingNew) {
    note.append(el('div', { className: 'note' }, 'Sign in to the other account in the GitLab tab. It is saved automatically.'));
  } else if (s.signedOut) {
    note.append(el('div', { className: 'note' },
      el('b', {}, s.active), ' is signed out of GitLab. Sign in to it again, then open this menu once.'));
  } else if (!s.accounts.length) {
    note.append(
      el('div', { className: 'note' },
        el('div', {}, 'Sign in to GitLab, then save the account here.'),
        el('button', { className: 'primary', onclick: save }, 'Save this account'))
    );
  }

  // Accounts
  const list = $('accounts');
  list.replaceChildren();
  for (const a of s.accounts) {
    const isActive = a.name === s.active;
    list.append(
      el('div', { className: 'row' + (isActive ? ' active' : '') },
        el('span', { className: 'name', title: a.name }, a.name),
        isActive
          ? el('span', { className: 'tag' }, s.signedOut ? 'signed out' : 'in use')
          : el('button', { onclick: () => act({ type: 'switch', name: a.name }) }, 'Use'),
        el('button', {
          className: 'x', title: 'Remove',
          onclick: () => act({ type: 'remove', name: a.name }),
        }, '✕'))
    );
  }

  // Rules
  const rules = $('rules');
  rules.replaceChildren();
  const entries = Object.entries(s.rules);
  if (!entries.length) {
    rules.append(el('div', { className: 'muted' }, 'Nothing yet — learned automatically the first time a link opens.'));
  }
  for (const [ns, name] of entries) {
    rules.append(
      el('div', { className: 'rule' },
        el('code', { title: ns }, ns),
        el('span', { className: 'muted' }, '→ ' + name),
        el('button', { className: 'x', title: 'Remove', onclick: () => act({ type: 'deleteRule', ns }) }, '✕'))
    );
  }

  const sel = $('acc');
  sel.replaceChildren(...s.accounts.map((a) => el('option', { value: a.name }, a.name)));
}

async function act(msg) {
  await send(msg);
  render();
}

async function save() {
  let r = await send({ type: 'save' });
  if (r && r.needName) {
    const name = prompt('Name for this account:');
    if (!name) return;
    r = await send({ type: 'save', name });
  }
  render();
}

$('addAnother').onclick = async () => {
  await send({ type: 'addAnother' });
  window.close();
};

$('addRule').onclick = () => {
  const ns = $('ns').value;
  const name = $('acc').value;
  if (!ns.trim() || !name) return;
  $('ns').value = '';
  act({ type: 'setRule', ns, name });
};

render();
