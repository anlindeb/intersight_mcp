import crypto from "crypto";

export interface SignedHeaders {
  authorization: string;
  date: string;
  digest: string;
  host: string;
}

export function sha256Base64(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("base64");
}

export function canonicalString(method: string, pathWithQuery: string, host: string, date: string, body: string) {
  const digestB64 = sha256Base64(body || "");
  return {
    signingString: [
      `(request-target): ${method.toLowerCase()} ${pathWithQuery}`,
      `host: ${host}`,
      `date: ${date}`,
      `digest: SHA-256=${digestB64}`,
    ].join("\n"),
    digestB64
  };
}

export function signRequest({
  method,
  path,
  body,
  host,
  apiKeyId,
  privateKeyPem,
}: {
  method: string;
  path: string; // includes query string if present
  body: string;
  host: string;
  apiKeyId: string;
  privateKeyPem: string | Buffer;
}): SignedHeaders {
  const date = new Date().toUTCString();
  const { signingString, digestB64 } = canonicalString(method, path, host, date, body);

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingString);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString("base64");

  const authorization =
    `Signature keyId=\"ApiKey ${apiKeyId}\",algorithm=\"rsa-sha256\",headers=\"(request-target) host date digest\",signature=\"${signature}\"`;

  return {
    authorization,
    date,
    digest: `SHA-256=${digestB64}`,
    host,
  };
}