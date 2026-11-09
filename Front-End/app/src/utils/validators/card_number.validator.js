export const cardNumberValidator = (value) => {
  if (!value) return false;
  const s = String(value).replace(/[\s-]/g, '');
  if (!/^\d{16}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let d = +s[i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};
