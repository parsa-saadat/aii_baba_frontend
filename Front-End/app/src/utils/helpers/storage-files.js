import axios from 'axios';
import { getBody, getId, isDirectImage } from './response.js';

const API = import.meta.env?.VITE_APP_API_URL || 'http://localhost:3000';
const cache = new Map();

const bytesToBase64 = (bytes) => {
  const chunks = [];
  for (let index = 0; index < bytes.length; index += 32768) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 32768)));
  }
  return btoa(chunks.join(''));
};

// GET /storage/:id returns a JSON document containing a Mongo Buffer,
// not an image response. Convert that document into a browser image URL.
export const fileDataUrl = (file) => {
  if (isDirectImage(file)) return file;
  if (!file || typeof file !== 'object') return '';
  if (isDirectImage(file.url)) return file.url;
  if (isDirectImage(file.src)) return file.src;

  let data = file.data;
  if (data?.type === 'Buffer' && Array.isArray(data.data)) data = data.data;
  if (data?.$binary?.base64) data = data.$binary.base64;
  const mime = file.contentType || file.mimetype || file.mime || 'image/jpeg';
  if (!String(mime).startsWith('image/')) return '';

  if (typeof data === 'string' && data) {
    return data.startsWith('data:') ? data : `data:${mime};base64,${data}`;
  }

  let bytes;
  if (data instanceof Uint8Array) bytes = data;
  else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
  else if (Array.isArray(data)) bytes = Uint8Array.from(data);
  else if (data && typeof data === 'object') {
    const values = Object.values(data);
    if (
      values.length &&
      values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
    ) {
      bytes = Uint8Array.from(values);
    }
  }
  if (!bytes?.length) return '';
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
};

export const resolveStorageImage = async (file, force = false) => {
  const embedded = fileDataUrl(file);
  if (embedded) return embedded;
  const id = getId(file);
  if (!id) return '';
  if (isDirectImage(id)) return id;
  const key = `${API}/${id}`;
  if (!force && cache.has(key)) return cache.get(key);

  const request = axios
    .get(`${API}/storage/${encodeURIComponent(id)}`, { timeout: 15000 })
    .then((response) => {
      if (response.data?.success === false) throw new Error(response.data.message);
      const url = fileDataUrl(getBody(response));
      if (!url) throw new Error('فایل تصویری معتبری دریافت نشد.');
      return url;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, request);
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return request;
};
