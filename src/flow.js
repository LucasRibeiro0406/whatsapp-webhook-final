// src/flow.js

// Esta função é o cérebro do seu webhook.
// Ela decide qual tela enviar com base na interação do usuário.
export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action } = decryptedBody;
  console.log(`Ação recebida: ${action}, Tela atual: ${screen}`);

  // Lida com a requisição inicial ao abrir o flow e exibe a tela APPOINTMENT
  if (action === "INIT") {
    console.log("Ação INIT: Enviando dados iniciais para a tela APPOINTMENT.");
    // Estes são os dados que o seu JSON espera para a primeira tela.
    return {
      version: "7.1", // A versão DEVE corresponder ao seu JSON
      screen: "APPOINTMENT",
      data: {
        department: [
          { id: "beauty", title: "Beleza e Cuidado Pessoal" },
          { id: "clothing", title: "Roupas e Acessórios" },
          { id: "home", title: "Casa e Decoração" },
        ],
        is_location_enabled: false,
        is_date_enabled: false,
        is_time_enabled: false,
      },
    };
  }

  // Lida com as interações do usuário (cliques em botões, seleções em dropdowns)
  if (action === "data_exchange") {
    switch (screen) {
      // Caso o usuário interaja com a tela APPOINTMENT
      case "APPOINTMENT":
        console.log("Data Exchange na tela APPOINTMENT:", data);
        // Lógica para quando um departamento é selecionado
        // Habilita o próximo dropdown (localização)
        return {
          version: "7.1",
          screen: "APPOINTMENT",
          data: {
            // Mantém os dados que já tínhamos
            ...data, 
            // Novos dados para o próximo passo
            is_location_enabled: true,
            location: [
              { id: "1", title: "King’s Cross, London" },
              { id: "2", title: "Oxford Street, London" },
            ],
          },
        };

      // Caso o usuário interaja com a tela DETAILS (preencheu nome, email, etc.)
      case "DETAILS":
        console.log("Data Exchange na tela DETAILS:", data);
        // Processa os dados do formulário e prepara a tela de resumo
        const summaryAppointment = `Agendamento para ${data.department} em ${data.location} no dia ${data.date} às ${data.time}.`;
        const summaryDetails = `Nome: ${data.name}\nEmail: ${data.email}\nTelefone: ${data.phone}\nDetalhes: ${data.more_details || 'N/A'}`;
        
        return {
            version: "7.1",
            screen: "SUMMARY",
            data: {
                appointment: summaryAppointment,
                details: summaryDetails,
                // Passa os dados adiante caso precise deles na tela final
                ...data 
            }
        };
    }
  }

  // Lida com a navegação entre telas (quando o usuário clica em "Continuar")
  if (action === "navigate") {
    switch (screen) {
        case "APPOINTMENT":
            console.log("Navegando da tela APPOINTMENT para DETAILS");
            return {
                version: "7.1",
                screen: "DETAILS",
                data: data // Passa os dados selecionados (departamento, local, etc.) para a próxima tela
            };
        case "SUMMARY":
             console.log("Navegando da tela SUMMARY para a tela final de confirmação");
             return {
                version: "7.1",
                screen: "CONFIRMATION", // Uma nova tela terminal que vamos criar
                data: {
                    message: "Seu agendamento foi confirmado com sucesso!"
                }
             }
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error("Unhandled request.");
};