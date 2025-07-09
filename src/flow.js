// src/flow.js

// Função principal que decide qual tela mostrar a seguir.
export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action } = decryptedBody;
  console.log(`Ação recebida: ${action}, Tela atual: ${screen}`);

  // Lida com a requisição inicial ao abrir o flow.
  // Envia a tela APPOINTMENT com os dados iniciais para os dropdowns.
  if (action === "INIT") {
    console.log("Ação INIT: Enviando a tela de agendamento inicial.");
    return {
      version,
      screen: "APPOINTMENT",
      data: {
        // Estes são os dados que preenchem seus dropdowns.
        // No futuro, você pode buscar isso de um banco de dados.
        department: [
          { id: "beauty", title: "Beleza & Cuidado Pessoal" },
          { id: "electronics", title: "Eletrônicos" },
        ],
        is_location_enabled: false, // Começa desabilitado até um departamento ser escolhido
        is_date_enabled: false,
        is_time_enabled: false,
      },
    };
  }

  // Lida com interações do usuário dentro do flow.
  if (action === "data_exchange") {
    switch (screen) {
      // Caso o usuário interaja com a tela de agendamento.
      case "APPOINTMENT":
        console.log("Troca de dados na tela APPOINTMENT:", data);
        // Exemplo: Usuário selecionou um departamento.
        // Agora habilitamos o dropdown de localização e o preenchemos.
        return {
          version,
          screen: "APPOINTMENT",
          data: {
            ...data, // Mantém os dados que já foram selecionados
            is_location_enabled: true,
            location: [
              { id: "1", title: "King’s Cross, London" },
              { id: "2", title: "Oxford Street, London" },
            ],
            // Você pode adicionar mais lógica aqui para habilitar data/hora
            is_date_enabled: true,
            date: [{ id: "2024-12-25", title: "25 de Dezembro" }],
            is_time_enabled: true,
            time: [{ id: "10:30", title: "10:30" }],
          },
        };

      // Caso o usuário tenha preenchido seus detalhes e clicado em "Continuar".
      case "DETAILS":
        console.log("Troca de dados na tela DETAILS:", data);
        // Agora, montamos a tela de resumo com os dados coletados.
        return {
          version,
          screen: "SUMMARY",
          data: {
            // Passa todos os dados para a tela de resumo.
            ...data,
            appointment: `Agendamento para ${data.date} às ${data.time}`,
            details: `Nome: ${data.name}\nEmail: ${data.email}\nTelefone: ${data.phone}`,
          },
        };
      
      // Caso o usuário confirme na tela de resumo.
      case "SUMMARY":
        console.log("Troca de dados na tela SUMMARY: Agendamento confirmado!");
        // TODO: Salvar os dados finais no seu banco de dados.
        // Ex: await supabase.from('agendamentos').insert({ ...data });
        
        // Envia uma tela final de sucesso.
        return {
            version,
            screen: "SUCCESS", // Você precisaria adicionar uma tela "SUCCESS" no seu JSON.
            data: {
                message: "Seu agendamento foi confirmado com sucesso!"
            }
        }
    }
  }

  // Lida com a navegação entre telas (ex: do APPOINTMENT para DETAILS).
  if (action === "navigate") {
    if (screen === "APPOINTMENT") {
      console.log("Navegando de APPOINTMENT para DETAILS.");
      return {
        version,
        screen: "DETAILS",
        data: data, // Passa os dados selecionados (departamento, local, etc.) para a próxima tela.
      };
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error("Unhandled request.");
};