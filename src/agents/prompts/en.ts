export const englishPrompts = {
  greeting: (storeName: string) =>
    `Hello and welcome to ${storeName}! 🎂✨\nI'm SellBot, your personal pastry and gift assistant. How can I make your day sweeter today?\n\nYou can ask me:\n• "Recommend a birthday cake under ₹800"\n• "Show eggless options"\n• "Send your gift hampers"`,
  clarify: () =>
    `I'd love to help! Could you tell me the occasion and if you have a specific flavor or budget in mind? 🍰`,
  emptyCartCheckout: () =>
    `Your cart is currently empty! Would you like me to recommend our #1 bestseller, the Chocolate Truffle Cake (₹750)?`,
  upsellCandles: () =>
    `Would you like to add our Birthday Candle & Sparkler Set (+₹30) or a handwritten pop-up greeting card (+₹120)? ✨`,
};
