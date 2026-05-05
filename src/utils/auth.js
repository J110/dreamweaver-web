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
  if (user?.username) {
    callPosthog((posthog) => {
      posthog.identify(user.username, {
        $set: { username: user.username },
        $set_once: { first_seen_at: new Date().toISOString() },
      });
    });
  }
};

export const removeUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dreamweaver_user');
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const logout = () => {
  removeToken();
  removeUser();
  callPosthog((posthog) => posthog.reset());
};
