export const urduPrompts = {
  greeting: (storeName: string) =>
    `Assalam-o-Alaikum! 🌸 ${storeName} mein khushamdeed!\nMain SellBot hoon, aapka 24/7 personal sales assistant. Main aapki kya madad kar sakta hoon?\n\nAap mujhse pooch saktay hain:\n• "Kal ke liye fresh cake chahiye"\n• "Brownies aur gift hampers dikhao"\n• "EasyPaisa / COD delivery charges kya hain?"`,

  howAreYou: () =>
    `Walaikum Assalam! Main theek hoon alhamdulillah! ❤️ Aap sunayein kaisay hain? Aaj aapke liye kya fresh ready karwayein?`,

  clarify: () =>
    `Zaroor! Kya aapka koi specific flavor ya celebration mind mein hai? Chocolate, red velvet, ya custom treats? Aur aapka budget kitna hai? 🍰`,

  emptyCartCheckout: () =>
    `Aapki cart abhi khali hai! Kya main hamara top-seller *Chocolate Fudge Truffle Cake* (Rs. 750) dikhaun?`,

  outOfScope: (item: string, storeName: string) =>
    `Maazrat chahtay hain janab! 🙏 Hum ${item} mein deal nahi kartay. ${storeName} par fresh cakes, brownies, cookies aur gift hampers available hain. Agar aapko koi celebration cake ya sweet treat chahiye ho toh batayein! 😊`,

  upsellCandles: () =>
    `Kya order ke sath celebration candles (+Rs. 30) ya luxury gift packing (+Rs. 99) add kar dein? 🎉`,
};
