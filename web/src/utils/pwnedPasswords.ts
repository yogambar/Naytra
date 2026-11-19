/**
 * Have I Been Pwned k-Anonymity range check utility.
 * Sends ONLY the first 5 characters of the SHA-1 hash to the API.
 * The remaining 35 characters are compared locally in the browser.
 * The plaintext password never leaves the user's device.
 */
export async function checkPasswordBreached(password: string): Promise<{ isBreached: boolean; count: number }> {
  if (!password || password.length === 0) {
    return { isBreached: false, count: 0 };
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: {
        'Add-Padding': 'true', // Protection against response size analysis
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { isBreached: false, count: 0 };
    }

    const text = await res.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [entrySuffix, countStr] = line.trim().split(':');
      if (entrySuffix === suffix) {
        const count = parseInt(countStr, 10);
        return { isBreached: true, count: isNaN(count) ? 1 : count };
      }
    }

    return { isBreached: false, count: 0 };
  } catch {
    // If network or API is down or throttled, fail open so user registration is not blocked
    return { isBreached: false, count: 0 };
  }
}
