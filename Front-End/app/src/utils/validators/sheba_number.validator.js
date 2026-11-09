export const shebaNumberValidator = (value) => {
  if (!value) return false;
  const s = String(value).toUpperCase().replace(/\s/g, '');
  if (!/^IR\d{24}$/.test(s)) return false;
  const rearranged = s.slice(4) + '1827' + s.charCodeAt(0) + s.charCodeAt(1);
  let remainder = 0;
  for (const ch of rearranged) remainder = (remainder * 10 + +ch) % 97;
  return remainder === 1;
};
