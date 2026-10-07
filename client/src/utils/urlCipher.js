const KEY = "festive-2026";

const xorDecode = (value) => {
  const key = KEY.split("");
  const chars = value.split("");

  return chars
    .map((char, index) => {
      const keyChar = key[index % key.length].charCodeAt(0);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    })
    .join("");
};

export const decodeUrl = (value, fallback = "http://localhost:5000/api") => {
  if (!value) {
    return fallback;
  }

  if (String(value).startsWith("enc:")) {
    try {
      const encoded = String(value).slice(4);
      return xorDecode(atob(encoded));
    } catch (_error) {
      return fallback;
    }
  }

  return String(value);
};

export const encodeUrl = (value) => {
  if (!value) {
    return "";
  }

  const key = KEY.split("");
  const chars = String(value).split("");

  const encoded = chars
    .map((char, index) => {
      const keyChar = key[index % key.length].charCodeAt(0);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    })
    .join("");

  return `enc:${btoa(encoded)}`;
};
