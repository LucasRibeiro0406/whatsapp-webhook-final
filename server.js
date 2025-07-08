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

  const encryptedFlowDataWithTag = Buffer.from(body.encrypted_flow_data, "base64");
  const iv = Buffer.from(body.iv, "base64");

  const tagLength = 16;
  const ciphertext = encryptedFlowDataWithTag.slice(0, -tagLength);
  const authTag = encryptedFlowDataWithTag.slice(-tagLength);

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
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

      // Criptografar o `challenge`, que é o payload do teste.
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
    else if (body.encrypted_flow_data && body.iv) {
      try {
        console.log("User interaction data received. Decrypting...");
        const decryptedData = decryptFlowData(body);
        
        const { screen, data, version } = decryptedData;
        // Adapte a lógica abaixo para as telas do seu JSON
        if (screen === 'APPOINTMENT' || screen === 'DETAILS' || screen === 'SUMMARY') {
          console.log(`Responding to screen: ${screen}`);
          // Aqui você adicionaria sua lógica para buscar dados, etc.
          // Por enquanto, vamos apenas devolver uma tela de sucesso.
          const responseScreen = {
            version,
            screen: 'SUMMARY', // Exemplo de resposta
            data: {
              appointment: "Dados recebidos com sucesso!",
              details: `Nome: ${data.name || 'N/A'}`
            },
          };
          return res.status(200).json(responseScreen);
        }
      } catch (error) {
         console.error("Failed to decrypt user data. This might be an unknown test payload.", error);
         return res.sendStatus(500);
      }
    }

    // CASO 3: Outro tipo de requisição (como o teste que estávamos recebendo)
    else {
        console.log("Received a request that is not a health check or user interaction. Assuming it's a simple ping.");
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