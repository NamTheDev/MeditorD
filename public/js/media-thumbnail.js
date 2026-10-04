const THUMBNAIL_MAX_WIDTH = 800;
const THUMBNAIL_MAX_HEIGHT = 1000;
const THUMBNAIL_QUALITY = 0.76;

function thumbnailDimensions(width, height) {
  const scale = Math.min(
    1,
    THUMBNAIL_MAX_WIDTH / Math.max(1, width),
    THUMBNAIL_MAX_HEIGHT / Math.max(1, height),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function thumbnailFromDrawable(drawable, width, height) {
  const dimensions = thumbnailDimensions(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(drawable, 0, 0, dimensions.width, dimensions.height);

  let blob = await canvasToBlob(canvas, "image/webp", THUMBNAIL_QUALITY);
  let extension = "webp";

  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", THUMBNAIL_QUALITY);
    extension = "jpg";
  }
  if (!blob) return null;

  return new File([blob], `gallery-thumbnail.${extension}`, {
    type: blob.type,
  });
}

async function fromFile(file) {
  if (!file?.type?.startsWith("image/")) return null;

  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return await thumbnailFromDrawable(
          bitmap,
          bitmap.width,
          bitmap.height,
        );
      } finally {
        bitmap.close?.();
      }
    } catch {}
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return await thumbnailFromDrawable(
      image,
      image.naturalWidth,
      image.naturalHeight,
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fromImage(image) {
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return null;
  }
  try {
    return await thumbnailFromDrawable(
      image,
      image.naturalWidth,
      image.naturalHeight,
    );
  } catch {
    return null;
  }
}

window.mediaThumbnail = {
  fromFile,
  fromImage,
};
