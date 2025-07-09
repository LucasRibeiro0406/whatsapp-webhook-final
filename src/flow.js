// src/flow.js

// Respostas de tela simples e neutras para evitar bloqueios de integridade.
const SCREEN_RESPONSES = {
  WELCOME: {
    version: "3.0",
    screen: "WELCOME",
    data: {
      welcome_title: "Bem-vindo(a)!",
      welcome_body: "Este é um teste de fluxo dinâmico. Clique em continuar para prosseguir.",
    },
  },
  SUCCESS: {
    version: "3.0",
    screen: "SUCCESS",
    data: {
      success_title: "Sucesso!",
      success_body: "O fluxo dinâmico e a criptografia estão funcionando perfeitamente.",
    },
  },
};

export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action } = decryptedBody;

  // Lida com a requisição inicial ao abrir o flow e exibe a tela WELCOME
  if (action === "INIT") {
    console.log("Ação INIT recebida, enviando a tela WELCOME.");
    return SCREEN_RESPONSES.WELCOME;
  }

  // Lida com a interação do usuário
  if (action === "data_exchange") {
    // Se o usuário interagiu com a tela WELCOME, envie a tela SUCCESS
    if (screen === "WELCOME") {
      console.log("Interação na tela WELCOME recebida, enviando a tela SUCCESS.");
      return SCREEN_RESPONSES.SUCCESS;
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error("Unhandled request.");
};
