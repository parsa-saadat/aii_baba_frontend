export const getBody = (response) => response?.data?.body ?? null;

export const getList = (response) => {
  const body = getBody(response);
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.data) ? body.data : [];
};

export const getId = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  return getId(value._id ?? value.$oid ?? value.id);
};

export const isDirectImage = (value) =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|blob:)/i.test(value);
