// src/lib/textFile.ts
// Read an uploaded CSV as text without mangling accents.
//
// File.text() always assumes UTF-8, but Excel on Windows saves "CSV" in the
// system code page (usually Windows-1252), and some exports are UTF-16. Decoding
// those as UTF-8 turns "Café" into "Caf�" before any tool sees the data.

export type TextEncodingName = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export type DecodedText = { text: string; encoding: TextEncodingName; hadBom: boolean };

/** Decode bytes, honouring a BOM, else UTF-8 if it is valid, else Windows-1252. */
export function decodeBytes(bytes: Uint8Array): DecodedText {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "utf-8", hadBom: true };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "utf-16le", hadBom: true };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "utf-16be", hadBom: true };
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8", hadBom: false };
  } catch {
    // Not valid UTF-8: almost always a Windows/Excel export.
    return { text: decodeWindows1252(bytes), encoding: "windows-1252", hadBom: false };
  }
}

// Windows-1252 differs from Latin-1 only in 0x80–0x9F (€, curly quotes, dashes, ™ …).
// Decoded by hand because some runtimes treat the label as plain Latin-1.
export const CP1252_HIGH = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ";

export function decodeWindows1252(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : String.fromCharCode(b);
  }
  return out;
}

export async function readTextFile(file: Blob): Promise<DecodedText> {
  return decodeBytes(new Uint8Array(await file.arrayBuffer()));
}
