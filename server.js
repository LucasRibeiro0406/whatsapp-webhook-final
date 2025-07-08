import express from "express";
import { decryptRequest, encryptResponse, FlowEndpointException } from "./src/encryption.js";
import { getNextScreen } from "./src/flow.js";
import crypto from "crypto";

const app = express();

app.use(
  express.json({
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  }),
);

const { APP_SECRET, PRIVATE_KEY, PASSPHRASE = "", PORT = "3000", WHATSAPP_VERIFY_TOKEN } = process.env;

// Rota POST principal para o Flow
app.post("/webhook", async (req, res) => {
  if (!PRIVATE_KEY) {
    return res.status(500).send("Private key is not set.");
  }

  if(!isRequestSignatureValid(req)) {
    return res.status(432).send();
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  console.log("💬 Decrypted Request:", decryptedBody);

  const screenResponse = await getNextScreen(decryptedBody);
  console.log("👉 Response to Encrypt:", screenResponse);

  return res.status(200).send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
});

// Rota GET para a verificação inicial do webhook
app.get("/webhook", (req, res) => {
    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === WHATSAPP_VERIFY_TOKEN
    ) {
        console.log("Webhook GET verification successful!");
        res.send(req.query["hub.challenge"]);
    } else {
        console.error("Webhook GET verification failed.");
        res.sendStatus(400);
    }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});

function isRequestSignatureValid(req) {
  if(!APP_SECRET) {
    console.warn("App Secret is not set up. Request validation is skipped.");
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  if (!signatureHeader) {
    console.error("Missing x-hub-signature-256 header.");
    return false;
  }
  
  const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "hex");
  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestBuffer = hmac.update(req.rawBody).digest();

  if (signatureBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  
  console.log("Signature is valid.");
  return true;
}