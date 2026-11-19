/**
 * Generates a unique username combining the user's name
 * and a number string derived from their email address.
 *
 * Example:
 *   Name: "Yogambar Singh", Email: "yogambarsingh2480@gmail.com"
 *   -> "yogambar_singh_2480"
 *
 *   Name: "Priya Sharma", Email: "priya@gmail.com"
 *   -> "priya_sharma_7421" (deterministic 4-digit number from email)
 */
export function generateUsername(name: string | null | undefined, email: string | null | undefined): string {
  const safeEmail = (email || '').toLowerCase().trim();
  const emailPrefix = safeEmail.split('@')[0] || 'trader';

  // 1. Clean user name slug: lowercase, replace spaces & non-alphanumeric with underscores
  let nameSlug = (name || emailPrefix)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!nameSlug) nameSlug = 'trader';

  // 2. Extract digits from email if present (e.g. "yogambarsingh2480" -> "2480")
  const emailDigits = emailPrefix.replace(/\D/g, '');

  let numberStr = '';
  if (emailDigits.length >= 2) {
    numberStr = emailDigits.slice(0, 6);
  } else {
    // Deterministic 4-digit number generated from email character codes
    let hash = 0;
    for (let i = 0; i < safeEmail.length; i++) {
      hash = ((hash << 5) - hash + safeEmail.charCodeAt(i)) | 0;
    }
    numberStr = String(Math.abs(hash % 9000) + 1000);
  }

  return `${nameSlug}_${numberStr}`;
}
