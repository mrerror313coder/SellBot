export interface LanguageDetectionResult {
  language: 'en' | 'hi' | 'hi-en' | 'es' | 'ar' | 'pt';
  displayName: string;
  confidence: number;
}

export class LanguageDetectorTool {
  public static detect(text: string): LanguageDetectionResult {
    const trimmed = text.trim();

    // Arabic Unicode block
    if (/[\u0600-\u06FF]/.test(trimmed)) {
      return { language: 'ar', displayName: 'Arabic', confidence: 0.98 };
    }

    // Devanagari script for pure Hindi
    if (/[\u0900-\u097F]/.test(trimmed)) {
      return { language: 'hi', displayName: 'Hindi (Devanagari)', confidence: 0.99 };
    }

    // Hinglish (Romanized Hindi) vocabulary detection
    const hinglishKeywords = [
      'kya', 'hai', 'hain', 'chahiye', 'mujhe', 'kitne', 'ka', 'ki', 'ke', 'bhejo', 'dikhao',
      'kal', 'dost', 'bhai', 'shukriya', 'daam', 'dena', 'acha', 'sahi', 'naam', 'namaste',
      'kar', 'raha', 'rahi', 'hoga', 'hogi', 'paise', 'batao', 'bataiye', 'kaise', 'bachega',
      'kaun', 'se', 'aap', 'aapka', 'aapki', 'yeh', 'woh', 'sabse', 'kripya', 'dijiye',
    ];
    const tokens = trimmed.toLowerCase().split(/\s+/);
    const hinglishMatchCount = tokens.filter((t) => hinglishKeywords.includes(t)).length;

    if (hinglishMatchCount >= 2 || (tokens.length <= 4 && hinglishMatchCount >= 1)) {
      return { language: 'hi-en', displayName: 'Hinglish (Hindi in English)', confidence: 0.92 };
    }

    // Spanish keywords
    const spanishKeywords = [
      'hola', 'necesito', 'quiero', 'cuanto', 'cuesta', 'pastel', 'torta', 'gracias',
      'por', 'favor', 'cumpleanos', 'cumpleaños', 'para', 'mama', 'mamá', 'amigo',
    ];
    if (tokens.some((t) => spanishKeywords.includes(t))) {
      return { language: 'es', displayName: 'Spanish', confidence: 0.95 };
    }

    // Portuguese keywords
    const portugueseKeywords = [
      'ola', 'olá', 'preciso', 'quero', 'quanto', 'custa', 'bolo', 'obrigado',
      'obrigada', 'para', 'mae', 'mãe', 'entrega', 'tamanho', 'voce', 'você',
    ];
    if (tokens.some((t) => portugueseKeywords.includes(t))) {
      return { language: 'pt', displayName: 'Portuguese', confidence: 0.95 };
    }

    // Default to English
    return { language: 'en', displayName: 'English', confidence: 0.90 };
  }
}
