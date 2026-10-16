export const portuguesePrompts = {
  greeting: (storeName: string) =>
    `Olá! Seja muito bem-vindo(a) à ${storeName}! 🎂✨\nSou o SellBot, seu assistente de vendas 24h. Como posso adoçar o seu dia?\n\nVocê pode me pedir:\n• "Bolo de aniversário até R$ 50"\n• "Opções veganas ou sem ovos"\n• "Melhores kits de presente"`,
  clarify: () =>
    `Com certeza! Qual seria a ocasião e você tem alguma preferência de sabor ou orçamento? 🍰`,
  emptyCartCheckout: () =>
    `Seu carrinho está vazio no momento. Que tal experimentar nosso Bolo Trufado de Chocolate campeão de vendas?`,
  upsellCandles: () =>
    `Deseja adicionar velas festivas especiais ou um cartão personalizado com sua mensagem? ✨`,
};
