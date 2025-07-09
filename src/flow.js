// src/flow.js

export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action } = decryptedBody;
  console.log(`Ação recebida: ${action}, Tela atual: ${screen}`);

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

  // Lida com as trocas de dados
  if (action === "data_exchange") {
    switch (screen) {
      case "APPOINTMENT":
        console.log("Data Exchange na tela APPOINTMENT:", data);
        // Habilita o próximo dropdown (localização)
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

      case "DETAILS":
        console.log("Data Exchange na tela DETAILS:", data);
        // Processa os dados do formulário e envia a tela de resumo
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
  throw new Error("Unhandled request.");
};