import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || '';
const CDN_URL = process.env.CLOUDFLARE_CDN_URL || '';

export async function procesarImagen(imageBuffer: Buffer): Promise<{
  status: string;
  message: string;
  urls?: {
    small: string;
    original: string;
  };
  timestamp?: string;
}> {
  try {
    console.log('Downloaded image buffer size:', imageBuffer.length);

    // Generar un nombre único para el archivo
    const fileExt = 'jpg'; // Asumimos que la imagen es jpg
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    const webpFilename = uniqueFilename.replace(`.${fileExt}`, '.webp');

    // Procesar la imagen con sharp para crear diferentes tamaños
    const originalImage = sharp(imageBuffer);
    const metadata = await originalImage.metadata();

    // Crear versiones de diferentes tamaños
    const smallBuffer = await sharp(imageBuffer)
      .resize(300, null, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    const originalBuffer = await sharp(imageBuffer)
      .webp({ quality: 85 })
      .toBuffer();

    // Subir cada versión a R2
    const uploadPromises = [
      uploadToR2(smallBuffer, `small/${webpFilename}`, 'image/webp'),
      uploadToR2(originalBuffer, `original/${webpFilename}`, 'image/webp')
    ];

    await Promise.all(uploadPromises);

    // Construir las URLs para cada tamaño
    const smallUrl = `${CDN_URL}/small/${webpFilename}`;
    const originalUrl = `${CDN_URL}/original/${webpFilename}`;

    console.log('Imagen subida a Cloudflare con éxito');
    console.log('URLs:', { smallUrl, originalUrl });

    return {
      status: 'success',
      message: 'Imagen procesada y subida con éxito',
      urls: {
        small: smallUrl,
        original: originalUrl
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en el procesamiento de la imagen:', error);
    return {
      status: 'error',
      message: 'Error en el procesamiento de la imagen'
    };
  }
}

// Función auxiliar para subir a R2
export async function uploadToR2(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000'
  })
  
  return s3Client.send(command)
}



//funcion para descargar la imagen del comprobante desde WATISERVER
async function downloadImage(imagePath: string): Promise<Buffer> {
  console.log("Downloading image from:", imagePath);
  const url = `https://live-mt-server.wati.io/467884/api/v1/getMedia?fileName=${encodeURIComponent(
    imagePath
  )}`;
  console.log("Generated URL for image download:", url);

  const response = await fetch(url, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkM2VmZGU2My1kOTllLTQ3ZGMtYjRkOS1iM2YxY2UyNjQyZDkiLCJ1bmlxdWVfbmFtZSI6ImludmVydGltZXNhQGdtYWlsLmNvbSIsIm5hbWVpZCI6ImludmVydGltZXNhQGdtYWlsLmNvbSIsImVtYWlsIjoiaW52ZXJ0aW1lc2FAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMDcvMTIvMjAyNSAxODo0NjoyMSIsInRlbmFudF9pZCI6IjQ2Nzg4NCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.GgqBdZgU7rjUVnNqWnrJ-zTKiBRntR-8_oOGhkLlvmQ",
    },
  });

  console.log("Response status from Wati server:", response.status);

  if (!response.ok) {
    throw new Error(
      `Failed to download image from Wati: ${response.status} ${response.statusText}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
export { downloadImage };


export function convertirAHorarioArgentino(fechaUTC: string) {
  // Crear un objeto Date a partir de la fecha UTC
  const fecha = new Date(fechaUTC);

  // Ajustar la fecha a UTC-3
  // Formatear la fecha en el formato deseado
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses en JavaScript son 0-indexados
  const año = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');

  return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
}

// Ejemplo de uso
const fechaUTC = "2023-10-05T15:30:00Z";
const fechaArgentina = convertirAHorarioArgentino(fechaUTC);
console.log(fechaArgentina);