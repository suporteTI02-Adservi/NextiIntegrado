export const getGreetingMessage = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Bom dia! Tudo bem com você?";
  } else if (hour >= 12 && hour < 18) {
    return "Boa tarde! Como vão as coisas?";
  } else {
    // Para horas >= 18 ou < 5
    return "Boa noite! Trabalhando duro hoje?";
  }
};
