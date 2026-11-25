import crypto from "crypto";

const accountId =
  process.env.R2_ACCOUNT_ID || "337b9bdf98bdef65e0ecd4d76c061517";
const accessKeyId =
  process.env.R2_ACCESS_KEY_ID || "a105f296343ba8715160218e1361c3af";
const secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY ||
  "0c1e683eda99794885e5a271f036ef28618429f81d0e24a20fd763641685273f";
const bucketName = process.env.R2_BUCKET_NAME || "tor-uploads";
const region = "auto";

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string | Buffer): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

export function isR2Enabled(): boolean {
  return Boolean(accessKeyId && secretAccessKey && bucketName && accountId);
}

/**
 * Upload buffer directly to Cloudflare R2 via S3 SigV4 API
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<boolean> {
  if (!isR2Enabled()) return false;

  try {
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = sha256(buffer);
    const canonicalUri = `/${bucketName}/${filename}`;

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest =
      `PUT\n` +
      `${canonicalUri}\n` +
      `\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign =
      `${algorithm}\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${sha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorizationHeader =
      `${algorithm} ` +
      `Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, ` +
      `Signature=${signature}`;

    const url = `https://${host}${canonicalUri}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorizationHeader,
      },
      body: buffer,
    });

    if (res.ok) {
      console.log(`✅ [R2] Successfully uploaded ${filename} to Cloudflare R2 bucket ${bucketName}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`❌ [R2] Upload failed for ${filename}:`, res.status, errText);
      return false;
    }
  } catch (error) {
    console.error(`❌ [R2] Upload exception for ${filename}:`, error);
    return false;
  }
}

/**
 * Fetch buffer from Cloudflare R2 via S3 SigV4 API
 */
export async function getFromR2(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isR2Enabled()) return null;

  try {
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = sha256("");
    const canonicalUri = `/${bucketName}/${filename}`;

    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest =
      `GET\n` +
      `${canonicalUri}\n` +
      `\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign =
      `${algorithm}\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${sha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorizationHeader =
      `${algorithm} ` +
      `Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, ` +
      `Signature=${signature}`;

    const url = `https://${host}${canonicalUri}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorizationHeader,
      },
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      return {
        buffer: Buffer.from(arrayBuffer),
        contentType,
      };
    }
    return null;
  } catch (error) {
    console.error(`❌ [R2] Get exception for ${filename}:`, error);
    return null;
  }
}
