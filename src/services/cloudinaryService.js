import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '../config/firebase';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

/** En React Native, fetch().blob() suele romper Firebase Storage. */
function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer la imagen local'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadWithBlob(uri, storageRef) {
  const blob = await uriToBlob(uri);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

async function uploadWithBase64(uri, storageRef) {
  // API clásica (estable en Expo Go / RN)
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

async function uploadToFirebaseStorage(uri, folder) {
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storageRef = ref(getFirebaseStorage(), path);

  try {
    return await uploadWithBlob(uri, storageRef);
  } catch (blobError) {
    console.warn('Storage blob falló, probando base64:', blobError.message);
    return await uploadWithBase64(uri, storageRef);
  }
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
  if (/^https?:\/\//i.test(uri)) return uri;

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
