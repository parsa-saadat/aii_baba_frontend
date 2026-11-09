// نگهداری توکن و اطلاعات کاربر برای درخواست‌های بک‌اند
export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};
export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const authHeaders = () => ({ headers: { Authorization: getToken() } });

export const readList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};
export const writeList = (key, list) => localStorage.setItem(key, JSON.stringify(list));
