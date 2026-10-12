import { expect, test } from "bun:test";
import { imageDimensions } from "../functions/image-dimensions";

function bytes(...args: number[]) { return new Uint8Array(args); }

test("WebP VP8X dimensions use the actual image geometry", () => {
  const data = new Uint8Array(30);
  data.set(new TextEncoder().encode("RIFF"), 0);
  data.set(new TextEncoder().encode("WEBPVP8X"), 8);
  data.set([31, 3, 0, 111, 1, 0], 24);
  expect(imageDimensions(data)).toEqual({ width: 800, height: 368 });
});

test("PNG, GIF and JPEG report width/height without decoding pixels", () => {
  const png = bytes(137,80,78,71,13,10,26,10, 0,0,0,13,73,72,68,82,
    0,0,2,128, 0,0,1,224);
  expect(imageDimensions(png)).toEqual({ width: 640, height: 480 });
  const gif = bytes(71,73,70,56,57,97, 0x90,0x01, 0x2c,0x01);
  expect(imageDimensions(gif)).toEqual({ width: 400, height: 300 });
  const jpeg = bytes(255,216, 255,224,0,4,1,2,
    255,192,0,17,8, 1,0,2,0, 3,1,17,0, 2,17,1, 3,17,1);
  expect(imageDimensions(jpeg)).toEqual({ width: 512, height: 256 });
});

test("malformed and unsupported image headers have no unsafe dimensions", () => {
  expect(imageDimensions(bytes())).toBeNull();
  expect(imageDimensions(bytes(255,216,255,192,0,3,0,0))).toBeNull();
  expect(imageDimensions(new Uint8Array(30))).toBeNull();
});
