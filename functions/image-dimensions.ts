export function imageDimensions(
  data: Uint8Array,
): { width: number; height: number } | null {
  const n = data.length;
  const valid = (width: number, height: number) =>
    width > 0 && height > 0 && width <= 65535 && height <= 65535
      ? { width, height }
      : null;
  const u16 = (i: number) => data[i]! | (data[i + 1]! << 8);
  const u24 = (i: number) =>
    data[i]! | (data[i + 1]! << 8) | (data[i + 2]! << 16);
  const u32be = (i: number) =>
    data[i]! * 16777216 +
    (data[i + 1]! << 16) +
    (data[i + 2]! << 8) +
    data[i + 3]!;

  if (
    n >= 24 &&
    data[0] === 137 &&
    data[1] === 80 &&
    data[2] === 78 &&
    data[3] === 71
  ) {
    return valid(u32be(16), u32be(20));
  }
  if (n >= 10 && data[0] === 71 && data[1] === 73 && data[2] === 70) {
    return valid(u16(6), u16(8));
  }
  if (
    n >= 30 &&
    String.fromCharCode(...data.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.subarray(8, 12)) === "WEBP"
  ) {
    const chunk = String.fromCharCode(...data.subarray(12, 16));
    if (chunk === "VP8X") return valid(u24(24) + 1, u24(27) + 1);
    if (chunk === "VP8L" && data[20] === 0x2f) {
      return valid(
        1 + (data[21]! | ((data[22]! & 0x3f) << 8)),
        1 + ((data[22]! >> 6) | (data[23]! << 2) | ((data[24]! & 0x0f) << 10)),
      );
    }
    if (
      chunk === "VP8 " &&
      data[23] === 0x9d &&
      data[24] === 0x01 &&
      data[25] === 0x2a
    ) {
      return valid(u16(26) & 0x3fff, u16(28) & 0x3fff);
    }
  }
  if (n >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let index = 2;
    while (index + 4 < n) {
      if (data[index] !== 0xff) break;
      while (data[index] === 0xff) index++;
      const marker = data[index++]!;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (index + 2 > n) break;
      const length = (data[index]! << 8) | data[index + 1]!;
      if (length < 2 || index + length > n) break;
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (length < 7) return null;
        return valid(
          (data[index + 5]! << 8) | data[index + 6]!,
          (data[index + 3]! << 8) | data[index + 4]!,
        );
      }
      index += length;
    }
  }
  return null;
}
