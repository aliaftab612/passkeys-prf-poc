export async function generateAESKeyFromWebAuthnKey(
  webAuthnPrfKey: string
): Promise<CryptoKey> {
  const prfKeyBuffer = Uint8Array.from(atob(webAuthnPrfKey), (c) =>
    c.charCodeAt(0)
  ).buffer;

  try {
    // Import the PRF key using subtleCrypto
    const importedKey = await crypto.subtle.importKey(
      'raw',
      prfKeyBuffer,
      { name: 'HKDF' }, // HKDF algorithm
      false,
      ['deriveKey']
    );

    // Derive the AES key using HKDF with SHA-256
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), // Empty salt
        info: new TextEncoder().encode('AES-256 Encryption Key'), // Info parameter
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Return the derived AES key
    return aesKey;
  } catch (error) {
    console.error('Error generating AES key:', error);
    throw error;
  }
}

export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  // Concatenate IV and ciphertext for easier storage/transmission
  const buffer = new Uint8Array([...iv, ...new Uint8Array(ciphertext)]);
  return window.btoa(String.fromCharCode(...buffer)); // Base64 encode
}

export async function decryptString(
  base64Ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = Uint8Array.from(atob(base64Ciphertext), (c) =>
    c.charCodeAt(0)
  );
  const iv = buffer.slice(0, 12); // First 12 bytes
  const ciphertext = buffer.slice(12);

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintextBuffer);
}
