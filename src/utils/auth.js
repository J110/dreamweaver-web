const callPosthog = (fn) => {
  if (typeof window === 'undefined') return;
  import('posthog-js')
    .then(({ default: posthog }) => {
      try {
        fn(posthog);
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      /* ignore */
    });
};

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dreamweaver_token');
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dreamweaver_token', token);
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dreamweaver_token');
};

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('dreamweaver_user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dreamweaver_user', JSON.stringify(user));

  const username = user?.username;
  const familyId = user?.family_id;
  if (!username) return;

  callPosthog((posthog) => {
    if (familyId) {
      // First login post-1.2 deploy: alias the prior identity (anonymous
      // distinct_id or the username from commit 1.1) onto family_id, then
      // switch to family_id as the canonical distinct_id. Skip the alias
      // call on subsequent logins for the same user on this device.
      const aliasFlag = `dv_alias_done:${username}`;
      if (!localStorage.getItem(aliasFlag)) {
        try { posthog.alias(familyId); } catch { /* ignore */ }
        localStorage.setItem(aliasFlag, '1');
      }
      posthog.identify(familyId, {
        $set: { username },
        $set_once: { first_seen_at: new Date().toISOString() },
      });
    } else {
      // Backend hasn't shipped family_id yet — fall back to commit 1.1 behavior.
      posthog.identify(username, {
        $set: { username },
        $set_once: { first_seen_at: new Date().toISOString() },
      });
    }
  });
};

export const removeUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dreamweaver_user');
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const logout = () => {
  // Read username before clearing so we can clean its alias flag.
  const u = getUser();
  if (u?.username) {
    localStorage.removeItem(`dv_alias_done:${u.username}`);
  }
  removeToken();
  removeUser();
  callPosthog((posthog) => posthog.reset());
};
