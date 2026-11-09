export const validateIRPhoneSyntax = (phone) => {
  if (!phone) return false;
  return /^09\d{9}$/.test(String(phone));
};

export const validateOtpSyntax = (code) => {
  if (!code) return false;
  return /^\d{6}$/.test(String(code));
};
