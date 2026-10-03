import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Script de Respaldo Híbrido hacia Google Drive
 * Cuenta de Bóveda: rutago.backups@gmail.com
 * Política: Conservar las 3 versiones más recientes de código y purgar las anteriores.
 */

function base64UrlEncode(strOrBuffer) {
  const buf = Buffer.isBuffer(strOrBuffer) ? strOrBuffer : Buffer.from(strOrBuffer);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getGoogleAccessToken(serviceAccountJson) {
  const credentials = typeof serviceAccountJson === 'string' 
    ? JSON.parse(serviceAccountJson) 
    : serviceAccountJson;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const message = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  const signature = signer.sign(credentials.private_key);
  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${message}.${encodedSignature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Error al autenticar con Google OAuth: ${tokenRes.status} ${errorText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function findOrCreateFolder(accessToken, folderName, clientEmail, parentFolderId = null) {
  // 1. Buscar si la carpeta compartida por el usuario existe
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,owners)&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      console.log(`✅ Carpeta compartida encontrada: "${data.files[0].name}" (ID: ${data.files[0].id})`);
      return data.files[0].id;
    }
  }

  // 2. Si no se encuentra, alertar que debe ser creada por la cuenta humana para usar los 15 GB
  throw new Error(
    `No se encontró la carpeta '${folderName}' en Google Drive.\n` +
    `👉 Para usar los 15 GB de tu cuenta 'rutago.backups@gmail.com':\n` +
    `   1. Abre Google Drive con rutago.backups@gmail.com.\n` +
    `   2. Crea una carpeta llamada exactly: ${folderName}\n` +
    `   3. Dale clic derecho ➔ Compartir ➔ Pega el correo del robot como 'Editor': ${clientEmail}`
  );
}

async function uploadFileToDrive(accessToken, filePath, fileName, mimeType, folderId) {
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };

  const boundary = '-------RutaGoBackupBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileData = fs.readFileSync(filePath);

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: binary\r\n\r\n'
    ),
    fileData,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Error al subir ${fileName} a Google Drive: ${uploadRes.status} ${err}`);
  }

  return await uploadRes.json();
}

async function rotateCodeBackups(accessToken, folderId, maxVersions = 3) {
  console.log(`\n🔍 Verificando versiones existentes de código en Google Drive (Límite: ${maxVersions})...`);

  let query = `name contains 'rutago_codigo_' and trashed = false`;
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=createdTime desc&fields=files(id,name,createdTime)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    console.warn('⚠️ No se pudo listar versiones anteriores de código para rotación.');
    return;
  }

  const data = await listRes.json();
  const files = data.files || [];
  console.log(`📦 Versiones de código encontradas en Drive: ${files.length}`);

  if (files.length > maxVersions) {
    const filesToDelete = files.slice(maxVersions);
    console.log(`♻️ Se encontraron ${files.length} versiones. Purgando ${filesToDelete.length} versión(es) obsoleta(s)...`);

    for (const file of filesToDelete) {
      const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (delRes.ok) {
        console.log(`   🗑️ Versión antigua eliminada: ${file.name} (${file.createdTime})`);
      } else {
        console.warn(`   ⚠️ Fallo al eliminar versión antigua: ${file.name}`);
      }
    }
  } else {
    console.log(`✅ Las versiones de código están dentro del límite permitido (<= ${maxVersions}).`);
  }
}

async function main() {
  console.log('🚀 Iniciando proceso de respaldo automático hacia Google Drive...');

  const credentialsRaw = process.env.RESPALDOS_RUTAGO;
  if (!credentialsRaw) {
    throw new Error('❌ Falta la variable de entorno RESPALDOS_RUTAGO con las credenciales de Google Service Account.');
  }

  const accessToken = await getGoogleAccessToken(credentialsRaw);
  console.log('✅ Autenticación con Google Drive exitosa.');
  
  const creds = JSON.parse(credentialsRaw);
  console.log(`🤖 Correo del Robot (Service Account): ${creds.client_email}`);

  // Obtener carpeta de destino compartida por el usuario
  const folderName = 'Respaldos_RutaGo';
  const customFolderId = process.env.GDRIVE_FOLDER_ID || null;
  let targetFolderId = customFolderId;

  if (!targetFolderId) {
    console.log(`🔍 Buscando carpeta compartida '${folderName}'...`);
    targetFolderId = await findOrCreateFolder(accessToken, folderName, creds.client_email);
  }
  console.log(`📁 ID de Carpeta de Destino: ${targetFolderId}`);

  // Archivo 1: Código Fuente (.zip)
  const zipPath = process.argv[2];
  if (zipPath && fs.existsSync(zipPath)) {
    const zipName = path.basename(zipPath);
    console.log(`\n⬆️ Subiendo código fuente: ${zipName}...`);
    const zipUpload = await uploadFileToDrive(accessToken, zipPath, zipName, 'application/zip', targetFolderId);
    console.log(`✅ Código fuente subido con ID: ${zipUpload.id}`);
  } else {
    console.log('⚠️ No se especificó archivo zip de código para subir.');
  }

  // Archivo 2: Base de Datos (.json)
  const dbPath = process.argv[3];
  if (dbPath && fs.existsSync(dbPath)) {
    const dbName = path.basename(dbPath);
    console.log(`\n⬆️ Subiendo base de datos completa: ${dbName}...`);
    const dbUpload = await uploadFileToDrive(accessToken, dbPath, dbName, 'application/json', targetFolderId);
    console.log(`✅ Base de datos subida con ID: ${dbUpload.id}`);
  } else {
    console.log('⚠️ No se especificó archivo de base de datos para subir.');
  }

  // Rotación de Versiones de Código (Regla de 3)
  await rotateCodeBackups(accessToken, targetFolderId, 3);

  console.log('\n🎉 Proceso de respaldo completado con éxito.');
}

main().catch((err) => {
  console.error('\n❌ ERROR EN EL PROCESO DE RESPALDO:', err);
  process.exit(1);
});
