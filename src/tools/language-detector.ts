export type SupportedLanguage = 'en' | 'ur' | 'hi' | 'hi-en' | 'es' | 'ar' | 'pt';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  displayName: string;
  confidence: number;
}

export class LanguageDetectorTool {
  public static detect(text: string): LanguageDetectionResult {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Urdu / Arabic script detection
    // Specific Urdu characters: ٹ (U+0679), ڈ (U+0688), ڑ (U+0691), ں (U+06BA), ے (U+06D2)
    if (/[\u0679\u0688\u0691\u06BA\u06D2]/.test(trimmed)) {
      return { language: 'ur', displayName: 'Urdu (اردو)', confidence: 0.99 };
    }

    // General Arabic block
    if (/[\u0600-\u06FF]/.test(trimmed)) {
      return { language: 'ar', displayName: 'Arabic (العربية)', confidence: 0.98 };
    }

    // 2. Devanagari script for pure Hindi
    if (/[\u0900-\u097F]/.test(trimmed)) {
      return { language: 'hi', displayName: 'Hindi (हिंदी)', confidence: 0.99 };
    }

    // 3. Pakistani Roman Urdu detection
    const pakistaniUrduKeywords = [
      'salam', 'assalam', 'alaikum', 'walaikum', 'aoa', 'kasy', 'kesy', 'kese', 'kaise',
      'mujhy', 'mujhe', 'chahye', 'chahiye', 'kitny', 'kitnay', 'kitne', 'kia', 'kya',
      'btao', 'batao', 'bataiye', 'sunao', 'theek', 'alhamdulillah', 'shukriya', 'bhai',
      'janab', 'ap', 'aap', 'pesy', 'paise', 'bhejo', 'mangwana', 'mil', 'miley', 'ga', 'gi',
      'karachi', 'lahore', 'islamabad', 'rawalpindi', 'peshawar', 'multan', 'faisalabad',
      'easypaisa', 'jazzcash', 'raast', 'cod', 'cash on delivery', 'hain', 'hai', 'hoga', 'hogi',
      'leni', 'lena', 'kaun', 'konsa', 'konsi', 'achha', 'acha', 'zabardast', 'shukria',
    ];

    const tokens = lower.split(/[\s,?.!]+/).filter(Boolean);
    const urduMatchCount = tokens.filter((t) => pakistaniUrduKeywords.includes(t)).length;

    // Explicit Pakistani Islamic greetings or Roman Urdu markers
    if (
      /\b(aoa|salam|assalam|walaikum|alhamdulillah|kasy|kesy|mujhy|chahye|kitny|easypaisa|jazzcash|raast)\b/i.test(lower)
    ) {
      return { language: 'ur', displayName: 'Pakistani Urdu (Roman Urdu)', confidence: 0.96 };
    }

    if (urduMatchCount >= 2 || (tokens.length <= 4 && urduMatchCount >= 1)) {
      // Check if Indian Hindi markers exist (namaste, pranam, swagat)
      if (/\b(namaste|pranam|swagat|shikayat|daam|kripya)\b/i.test(lower)) {
        return { language: 'hi-en', displayName: 'Hinglish (Hindi in English)', confidence: 0.92 };
      }
      return { language: 'ur', displayName: 'Pakistani Urdu (Roman Urdu)', confidence: 0.94 };
    }

    // 4. Spanish keywords
    const spanishKeywords = [
      'hola', 'necesito', 'quiero', 'cuanto', 'cuesta', 'pastel', 'torta', 'gracias',
      'por', 'favor', 'cumpleanos', 'cumpleaños', 'para', 'mama', 'mamá', 'amigo',
    ];
    if (tokens.some((t) => spanishKeywords.includes(t))) {
      return { language: 'es', displayName: 'Spanish', confidence: 0.95 };
    }

    // 5. Portuguese keywords
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
