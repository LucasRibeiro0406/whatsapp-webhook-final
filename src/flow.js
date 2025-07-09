// src/flow.js

// Esta função é o cérebro do seu webhook.
// Ela decide qual tela enviar com base na interação do usuário.
export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action } = decryptedBody;
  console.log(`Ação recebida: ${action}, Tela atual: ${screen}`);

  // ==================================================================
  // CORREÇÃO FINAL: Lidar com a Verificação de Integridade (ping)
  // ==================================================================
  // O log provou que o teste de integridade envia um { action: 'ping' }.
  // Precisamos responder a isso para não travar o servidor.
  if (action === "ping") {
    console.log("Ação PING recebida (Verificação de Integridade). Respondendo com status ativo.");
    return {
      version: version, // Usa a versão da requisição
      data: {
        status: "active",
      },
    };
  }

  // Lida com a requisição inicial ao abrir o flow
  if (action === "INIT") {
    console.log("Ação INIT: Enviando dados iniciais para a tela APPOINTMENT.");
    return {
      version: "7.1",
      screen: "APPOINTMENT",
      data: {
        department: [
          { id: "beauty", title: "Beleza e Cuidado Pessoal" },
          { id: "clothing", title: "Roupas e Acessórios" },
        ],
        is_location_enabled: false,
      },
    };
  }

  // Lida com a atualização dinâmica de dados
  if (action === "update_data") {
    switch (screen) {
      case "APPOINTMENT":
        console.log("Update Data na tela APPOINTMENT:", data);
        return {
          version: "7.1",
          screen: "APPOINTMENT",
          data: {
            ...data,
            is_location_enabled: true,
            location: [
              { id: "1", title: "King’s Cross, London" },
              { id: "2", title: "Oxford Street, London" },
            ],
          },
        };
    }
  }

  // Lida com o envio de dados de um formulário
  if (action === "data_exchange") {
    switch (screen) {
      case "DETAILS":
        console.log("Data Exchange na tela DETAILS:", data);
        const summaryAppointment = `Agendamento para ${data.department} em ${data.location}.`;
        const summaryDetails = `Nome: ${data.name}\nEmail: ${data.email}\nTelefone: ${data.phone}`;
        
        return {
            version: "7.1",
            screen: "SUMMARY",
            data: {
                appointment: summaryAppointment,
                details: summaryDetails,
                ...data 
            }
        };
    }
  }

  // Lida com a navegação entre telas
  if (action === "navigate") {
    switch (screen) {
        case "APPOINTMENT":
            console.log("Navegando da tela APPOINTMENT para DETAILS");
            return {
                version: "7.1",
                screen: "DETAILS",
                data: data
            };
        case "SUMMARY":
             console.log("Navegando da tela SUMMARY para a tela final de confirmação");
             return {
                version: "7.1",
                screen: "CONFIRMATION",
                data: {
                    message: "Seu agendamento foi confirmado com sucesso!"
                }
             }
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  // Removemos o 'throw new Error' para não travar em casos inesperados.
  // Em vez disso, retornamos uma resposta vazia de sucesso.
  return { version: "7.1", data: { acknowledged: true } };
};