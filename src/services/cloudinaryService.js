import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '../config/firebase';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

async function uriToBlob(uri) {
  const response = await fetch(uri);
  return response.blob();
}

async function uploadToFirebaseStorage(uri, folder) {
  const blob = await uriToBlob(uri);
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

async function uploadToCloudinary(uri, folder) {
  const form = new FormData();
  form.append('file', {
    uri,
    type: 'image/jpeg',
    name: `upload_${Date.now()}.jpg`,
  });
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );

  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Error subiendo imagen a Cloudinary');
  }

  return data.secure_url;
}

/**
 * Sube imagen a URL persistente (Cloudinary o Firebase Storage).
 * Solo usa URI local si ambas fallan.
 */
export async function uploadImageAsync(uri, folder = 'uberclone') {
  if (!uri) return null;

  if (CLOUD_NAME && UPLOAD_PRESET) {
    try {
      return await uploadToCloudinary(uri, folder);
    } catch (err) {
      console.warn('Cloudinary falló, intentando Firebase Storage:', err.message);
    }
  }

  try {
    return await uploadToFirebaseStorage(uri, folder);
  } catch (err) {
    console.warn('Firebase Storage falló, se usa URI local:', err.message);
    return uri;
  }
}

export const cloudinaryService = {
  uploadImageAsync,
  isConfigured: Boolean(CLOUD_NAME && UPLOAD_PRESET),
};

export default cloudinaryService;
