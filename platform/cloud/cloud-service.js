/**
 * VN Office Cloud — Dịch vụ Upload/Download cơ bản cho Google Drive & OneDrive.
 *
 * Chỉ hỗ trợ thao tác theo yêu cầu thủ công (không sync tự động):
 * - Lưu file lên cloud (upload)
 * - Mở file từ cloud (download)
 */

import { CloudConfig } from "./cloud-config.js";
import { CloudTokenManager } from "./cloud-token-manager.js";
import { CloudOAuth } from "./cloud-oauth.js";

/**
 * Upload file lên Google Drive.
 */
async function uploadToGoogle(accessToken, fileName, fileContent, mimeType) {
  const metadata = {
    name: fileName,
    parents: [],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([fileContent], { type: mimeType }), fileName);

  const response = await fetch(
    `${CloudConfig.providers.google.uploadEndpoint}?uploadType=multipart`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Upload lên Google Drive thất bại: ${error.error?.message || `HTTP ${response.status}`}`);
  }

  return response.json();
}

/**
 * Upload file lên OneDrive.
 */
async function uploadToOneDrive(accessToken, fileName, fileContent, mimeType) {
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/VNOffice/${fileName}:/content`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: fileContent,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Upload lên OneDrive thất bại: ${error.error?.message || `HTTP ${response.status}`}`);
  }

  return response.json();
}

/**
 * Liệt kê file gần đây từ Google Drive.
 */
async function listGoogleFiles(accessToken, pageSize = 10) {
  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: "files(id,name,mimeType,modifiedTime,size)",
    orderBy: "modifiedTime desc",
  });

  const response = await fetch(`${CloudConfig.providers.google.listEndpoint}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Liệt kê file Google Drive thất bại: ${error.error?.message || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Liệt kê file gần đây từ OneDrive.
 */
async function listOneDriveFiles(accessToken, pageSize = 10) {
  const params = new URLSearchParams({
    top: String(pageSize),
  });

  const response = await fetch(`${CloudConfig.providers.onedrive.listEndpoint}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Liệt kê file OneDrive thất bại: ${error.error?.message || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  return (data.value || []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.file?.mimeType || "",
    modifiedTime: f.lastModifiedDateTime,
    size: f.size,
  }));
}

/**
 * Download file từ Google Drive.
 */
async function downloadFromGoogle(accessToken, fileId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Tải file từ Google Drive thất bại: HTTP ${response.status}`);
  }

  return response.blob();
}

/**
 * Download file từ OneDrive.
 */
async function downloadFromOneDrive(accessToken, fileId) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Tải file từ OneDrive thất bại: HTTP ${response.status}`);
  }

  return response.blob();
}

function getMimeFromExtension(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeMap = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    odt: "application/vnd.oasis.opendocument.text",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    csv: "text/csv",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    odp: "application/vnd.oasis.opendocument.presentation",
    pdf: "application/pdf",
    txt: "text/plain",
    html: "text/html",
  };
  return mimeMap[ext] || "application/octet-stream";
}

export const CloudService = Object.freeze({
  /**
   * Upload file hiện tại lên cloud.
   * @param {string} providerId - "google" hoặc "onedrive"
   * @param {string} fileName - Tên file
   * @param {string|ArrayBuffer} fileContent - Nội dung file
   * @returns {Promise<Object>} - Kết quả upload
   */
  async uploadFile(providerId, fileName, fileContent) {
    const accessToken = await CloudOAuth.ensureValidToken(providerId);
    if (!accessToken) {
      throw new Error("Chưa kết nối tài khoản cloud. Vui lòng kết nối trước.");
    }

    const mimeType = getMimeFromExtension(fileName);

    if (providerId === "google") {
      return uploadToGoogle(accessToken, fileName, fileContent, mimeType);
    } else if (providerId === "onedrive") {
      return uploadToOneDrive(accessToken, fileName, fileContent, mimeType);
    }

    throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);
  },

  /**
   * Liệt kê file gần đây từ cloud.
   */
  async listFiles(providerId, pageSize = 10) {
    const accessToken = await CloudOAuth.ensureValidToken(providerId);
    if (!accessToken) {
      throw new Error("Chưa kết nối tài khoản cloud. Vui lòng kết nối trước.");
    }

    if (providerId === "google") {
      return listGoogleFiles(accessToken, pageSize);
    } else if (providerId === "onedrive") {
      return listOneDriveFiles(accessToken, pageSize);
    }

    throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);
  },

  /**
   * Download file từ cloud.
   */
  async downloadFile(providerId, fileId) {
    const accessToken = await CloudOAuth.ensureValidToken(providerId);
    if (!accessToken) {
      throw new Error("Chưa kết nối tài khoản cloud. Vui lòng kết nối trước.");
    }

    if (providerId === "google") {
      return downloadFromGoogle(accessToken, fileId);
    } else if (providerId === "onedrive") {
      return downloadFromOneDrive(accessToken, fileId);
    }

    throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);
  },
});
