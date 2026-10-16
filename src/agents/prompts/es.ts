export const spanishPrompts = {
  greeting: (storeName: string) =>
    `¡Hola! Bienvenido/a a ${storeName} 🎂✨\nSoy SellBot, tu asistente de ventas personal. ¿En qué puedo ayudarte hoy?\n\nPuedes preguntarme:\n• "Pastel para cumpleaños por menos de 800"\n• "¿Tienen opciones sin huevo?"\n• "Recomiéndame un regalo especial"`,
  clarify: () =>
    `¡Con gusto! ¿Para qué ocasión es y tienes algún sabor o presupuesto en mente? 🍰`,
  emptyCartCheckout: () =>
    `Tu carrito está vacío. ¿Te gustaría ordenar nuestro más vendido, el Pastel Trufado de Chocolate?`,
  upsellCandles: () =>
    `¿Deseas agregar un juego de velas festivas o una tarjeta de dedicatoria personalizada? ✨`,
};
