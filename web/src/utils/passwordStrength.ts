export interface PasswordStrengthResult {
  score: number; // 0 - 4
  label: 'Too Short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  percent: number;
  hasMinLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 10;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasMinLength) {
    return {
      score: 0,
      label: 'Too Short',
      color: '#C43232', // Brand Down / Red
      percent: Math.min(20, (password.length / 10) * 20),
      hasMinLength,
      hasLower,
      hasUpper,
      hasNumber,
      hasSpecial,
    };
  }

  let criteriaMet = 0;
  if (hasLower) criteriaMet++;
  if (hasUpper) criteriaMet++;
  if (hasNumber) criteriaMet++;
  if (hasSpecial) criteriaMet++;
  if (password.length >= 14) criteriaMet++;

  // score: 1 to 4
  let score = 1;
  let label: PasswordStrengthResult['label'] = 'Weak';
  let color = '#E65100'; // Amber/Orange

  if (criteriaMet >= 5) {
    score = 4;
    label = 'Strong';
    color = '#0B7A5A'; // Brand Up / Green
  } else if (criteriaMet >= 3) {
    score = 3;
    label = 'Good';
    color = '#10B981'; // Emerald
  } else if (criteriaMet >= 2) {
    score = 2;
    label = 'Fair';
    color = '#F2A93B'; // Brand Marigold
  }

  const percent = score * 25;

  return {
    score,
    label,
    color,
    percent,
    hasMinLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSpecial,
  };
}
