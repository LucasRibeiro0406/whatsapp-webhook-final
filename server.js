// server.js

const express = require("express");
const crypto = require("crypto");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.text({ type: "*/*" }));

const {
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET,
  WHATSAPP_PRIVATE_KEY,
} = process.env;

// Função para descriptografar dados de um Flow REAL.
function decryptFlowData(body) {
  const aesKey = crypto.privateDecrypt(
    {
      key: WHATSAPP_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(body.encrypted_aes_key, "base64")
  );

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    aesKey,
    Buffer.from(body.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(body.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(body.encrypted_flow_data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf-8"));
}

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

// Rota POST para receber os dados do Flow
app.post("/webhook", (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    if (!signature) {
      console.error("Missing signature header.");
      return res.sendStatus(401);
    }

    const hmac = crypto.createHmac("sha256", WHATSAPP_APP_SECRET);
    hmac.update(req.body);
    const calculatedSignature = `sha256=${hmac.digest("hex")}`;

    if (signature !== calculatedSignature) {
      console.error("Invalid signature.");
      return res.sendStatus(401);
    }

    console.log("Signature verified.");
    const body = JSON.parse(req.body);

    // ==================================================================
    // LÓGICA CORRETA: Separar o Health Check da Interação do Usuário
    // ==================================================================

    // CASO 1: É uma Verificação de Integridade (Health Check)
    if (body.action === 'health_check' && body.challenge) {
      console.log("Health check triggered. Performing handshake.");
      
      const aesKey = crypto.privateDecrypt(
        {
          key: WHATSAPP_PRIVATE_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(body.encrypted_aes_key, "base64")
      );

      const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        aesKey,
        Buffer.from(body.initial_vector, "base64")
      );

      // CORREÇÃO CRÍTICA: Criptografar o `challenge`, não o `encrypted_flow_data`.
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(body.challenge)),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();
      const responsePayload = Buffer.concat([encrypted, authTag]).toString("base64");

      console.log("Handshake successful.");
      return res.status(200).send(responsePayload);
    }
    
    // CASO 2: É uma interação real do usuário
    else if (body.encrypted_flow_data) {
      console.log("User interaction data received. Decrypting...");
      const decryptedData = decryptFlowData(body);
      
      const { screen, data, version } = decryptedData;
      if (screen === 'SCREEN_ID_NOME') {
        const userName = data.name_input || 'amigo(a)';
        const responseScreen = {
          version,
          screen: 'SCREEN_ID_SUCESSO',
          data: {
            success_title: `Obrigado, ${userName}!`,
            success_message: 'Seu agendamento foi recebido com sucesso.',
          },
        };
        console.log("Responding to SCREEN_ID_NOME");
        return res.status(200).json(responseScreen);
      }
    }

    // CASO 3: Outro tipo de requisição (como um ping simples)
    else {
        console.log("Received a simple ping or unknown request type.");
        return res.sendStatus(200);
    }

  } catch (error) {
    console.error("An error occurred in the POST /webhook endpoint:", error);
    return res.sendStatus(500);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});