const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");

let pemsCache = null;
let lastFetched = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function getPems() {
  if (pemsCache && (Date.now() - lastFetched) < CACHE_TTL) return pemsCache;

  const region = process.env.COGNITO_REGION;
  const poolId = process.env.COGNITO_USER_POOL_ID;
  if (!region || !poolId) throw new Error("COGNITO_REGION or COGNITO_USER_POOL_ID not set");

  const url = `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`;
  const { data } = await axios.get(url);

  const pems = {};
  data.keys.forEach((key) => {
    pems[key.kid] = jwkToPem(key);
  });

  pemsCache = pems;
  lastFetched = Date.now();
  return pems;
}

module.exports = async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, errors: [{ msg: "Unauthorized" }] });
    }
    const token = auth.slice(7);

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return res.status(401).json({ ok: false, errors: [{ msg: "Invalid token" }] });

    const pems = await getPems();
    const pem = pems[decoded.header.kid];
    if (!pem) return res.status(401).json({ ok: false, errors: [{ msg: "Invalid token" }] });

    jwt.verify(token, pem, { algorithms: ["RS256"], issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}` }, (err, payload) => {
      if (err) {
        console.error("JWT verify error:", err);
        return res.status(401).json({ ok: false, errors: [{ msg: "Invalid token" }] });
      }
     
      req.user = payload; 
      return next();
    });
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ ok: false, errors: [{ msg: "Unauthorized" }] });
  }
};
