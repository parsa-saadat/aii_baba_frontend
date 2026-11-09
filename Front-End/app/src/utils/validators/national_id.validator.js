export const nationalIDValidator = (value) => {
  if (!value || !/^\d{10}$/.test(value)) return false;
  const check = +value[9];
  const sum =
    value
      .split('')
      .slice(0, 9)
      .reduce((acc, d, i) => acc + +d * (10 - i), 0) % 11;
  return sum < 2 ? check === sum : check === 11 - sum;
};
