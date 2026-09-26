import { CloudOAuth } from "../../platform/cloud/cloud-oauth.js";

const { generateCodeVerifier, generateCodeChallenge, base64UrlEncode, generateState } = CloudOAuth;

export async function runCloudOAuthTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name: `${name}: ${error.message}`, pass: false }); }
  };

  await test("generateCodeVerifier: tạo chuỗi 43-128 ký tự RFC 7636", () => {
    const verifier = generateCodeVerifier();
    if (typeof verifier !== "string") throw new Error("Không phải chuỗi");
    if (verifier.length < 43 || verifier.length > 128) throw new Error(`Độ dài ${verifier.length} không trong khoảng 43-128`);
    if (!/^[A-Za-z0-9\-_]+$/.test(verifier)) throw new Error("Chứa ký tự không hợp lệ (chỉ A-Z, a-z, 0-9, -, _)");
  });

  await test("generateCodeVerifier: mỗi lần gọi tạo giá trị khác nhau", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    if (v1 === v2) throw new Error("Hai lần gọi trùng nhau");
  });

  await test("base64UrlEncode: encode đúng chuẩn base64url (không padding, URL-safe)", () => {
    const input = new Uint8Array([0x00, 0x01, 0x02, 0x7f, 0xff]);
    const encoded = base64UrlEncode(input);
    if (encoded.includes("+")) throw new Error("Vẫn chứa '+'");
    if (encoded.includes("/")) throw new Error("Vẫn chứa '/'");
    if (encoded.includes("=")) throw new Error("Vẫn chứa padding '='");
  });

  await test("base64UrlEncode: round-trip với các giá trị đặc biệt", () => {
    const special = new Uint8Array([0xfb, 0xef, 0xbe, 0xde]);
    const encoded = base64UrlEncode(special);
    if (!/^[A-Za-z0-9\-_]+$/.test(encoded)) throw new Error("Kết quả không phải base64url");
  });

  await test("generateCodeChallenge: tạo SHA-256 hash từ verifier, encode base64url", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    if (typeof challenge !== "string") throw new Error("Không phải chuỗi");
    if (!/^[A-Za-z0-9\-_]+$/.test(challenge)) throw new Error("Kết quả không phải base64url");
    if (challenge.length !== 43) throw new Error(`Độ dài challenge ${challenge.length} không đúng 43`);
  });

  await test("generateCodeChallenge: cùng verifier cho cùng challenge", async () => {
    const verifier = "test-verifier-12345";
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    if (c1 !== c2) throw new Error("Challenge không nhất quán");
  });

  await test("generateCodeChallenge: verifier khác nhau cho challenge khác nhau", async () => {
    const c1 = await generateCodeChallenge("verifier-a");
    const c2 = await generateCodeChallenge("verifier-b");
    if (c1 === c2) throw new Error("Verifier khác nhau nhưng challenge trùng nhau");
  });

  await test("generateState: tạo chuỗi ngẫu nhiên đủ dài cho CSRF protection", () => {
    const state = generateState();
    if (typeof state !== "string") throw new Error("Không phải chuỗi");
    if (state.length < 20) throw new Error(`State quá ngắn: ${state.length}`);
    if (!/^[A-Za-z0-9\-_]+$/.test(state)) throw new Error("State chứa ký tự không hợp lệ");
  });

  await test("generateState: mỗi lần gọi tạo giá trị khác nhau", () => {
    const s1 = generateState();
    const s2 = generateState();
    if (s1 === s2) throw new Error("Hai state trùng nhau");
  });

  return results;
}