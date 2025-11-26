/**
 * Text Analysis Module Tests
 * Tests for language detection, document parsing, metrics calculation,
 * and protected segment identification.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TextAnalyzer, analyzeText } from './text-analyzer';
import { detectLanguage, isLanguageSupported, getSupportedLanguages, SUPPORTED_LANGUAGES } from './language-detector';
import { parseDocument, extractSentences, countWords } from './document-parser';
import {
  calculateMetrics,
  calculateBurstiness,
  calculateLexicalDiversity,
} from './metrics-calculator';
import {
  parseProtectedSegments,
  extractWithPlaceholders,
  restoreProtectedSegments,
  validateProtectedSegments,
} from './protected-segment-parser';

describe('Language Detection', () => {
  it('should detect English text', () => {
    const text = 'This is a sample English text that should be detected correctly by the language detector.';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('en');
    expect(result.isSupported).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect Spanish text', () => {
    const text = 'Este es un texto de ejemplo en español que debería ser detectado correctamente.';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('es');
    expect(result.isSupported).toBe(true);
  });

  it('should return unknown for very short text', () => {
    const text = 'Hi';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('should return supported languages list for unsupported language', () => {
    // Japanese text
    const text = 'これは日本語のテキストです。言語検出のテストに使用されます。';
    const result = detectLanguage(text);
    
    expect(result.isSupported).toBe(false);
    expect(result.supportedLanguages).toBeDefined();
    expect(result.supportedLanguages).toContain('en');
  });


  it('should check if language is supported', () => {
    expect(isLanguageSupported('en')).toBe(true);
    expect(isLanguageSupported('es')).toBe(true);
    expect(isLanguageSupported('fr')).toBe(true);
    expect(isLanguageSupported('de')).toBe(true);
    expect(isLanguageSupported('pt')).toBe(true);
    expect(isLanguageSupported('ja')).toBe(false);
    expect(isLanguageSupported('zh')).toBe(false);
  });

  it('should return list of supported languages', () => {
    const languages = getSupportedLanguages();
    
    expect(languages).toHaveLength(5);
    expect(languages.map(l => l.code)).toContain('en');
    expect(languages.find(l => l.code === 'en')?.name).toBe('English');
  });
});

/**
 * Property-Based Tests for Language Detection
 * **Feature: ai-humanizer, Property 24: Language detection**
 * **Validates: Requirements 8.1, 8.4**
 * 
 * Property: For any text in a supported language with sufficient length,
 * the language detector should automatically detect the language and mark it as supported.
 */
describe('Language Detection Property Tests', () => {
  // Sample texts for each supported language (used to generate test data)
  // Note: Texts must be sufficiently long (50+ words) for reliable detection by franc library
  const languageSamples: Record<string, string[]> = {
    en: [
      'The quick brown fox jumps over the lazy dog near the river bank. This sentence contains many common English words and phrases that help with language detection. The more text we provide, the more accurate the detection becomes. Natural language processing is a fascinating field of study.',
      'This is a comprehensive test of the language detection system that we have built. The system uses advanced algorithms to identify the language of any given text. It supports multiple languages including English, Spanish, French, German, and Portuguese. The detection accuracy improves with longer text samples.',
      'Natural language processing enables computers to understand human text in meaningful ways. This technology has revolutionized how we interact with machines and has enabled many applications. From chatbots to translation services, natural language processing is everywhere in our daily lives.',
    ],
    es: [
      'El rápido zorro marrón salta sobre el perro perezoso cerca del río. Esta oración contiene muchas palabras y frases comunes en español que ayudan con la detección del idioma. Cuanto más texto proporcionemos, más precisa será la detección. El procesamiento del lenguaje natural es un campo de estudio fascinante.',
      'Esta es una prueba completa del sistema de detección de idiomas que hemos construido. El sistema utiliza algoritmos avanzados para identificar el idioma de cualquier texto dado. Admite varios idiomas, incluidos inglés, español, francés, alemán y portugués. La precisión de la detección mejora con muestras de texto más largas.',
      'El procesamiento del lenguaje natural permite a las computadoras entender el texto humano de maneras significativas. Esta tecnología ha revolucionado la forma en que interactuamos con las máquinas y ha permitido muchas aplicaciones. Desde chatbots hasta servicios de traducción, el procesamiento del lenguaje natural está en todas partes.',
    ],
    fr: [
      'Le renard brun rapide saute par-dessus le chien paresseux près de la rivière. Cette phrase contient de nombreux mots et expressions français courants qui aident à la détection de la langue. Plus nous fournissons de texte, plus la détection devient précise. Le traitement du langage naturel est un domaine d étude fascinant.',
      'Ceci est un test complet du système de détection de langue que nous avons construit. Le système utilise des algorithmes avancés pour identifier la langue de tout texte donné. Il prend en charge plusieurs langues, notamment l anglais, l espagnol, le français, l allemand et le portugais. La précision de la détection s améliore avec des échantillons de texte plus longs.',
      'Le traitement du langage naturel permet aux ordinateurs de comprendre le texte humain de manière significative. Cette technologie a révolutionné notre façon d interagir avec les machines et a permis de nombreuses applications. Des chatbots aux services de traduction, le traitement du langage naturel est partout dans notre vie quotidienne.',
    ],
    de: [
      'Der schnelle braune Fuchs springt über den faulen Hund in der Nähe des Flusses. Dieser Satz enthält viele gebräuchliche deutsche Wörter und Ausdrücke, die bei der Spracherkennung helfen. Je mehr Text wir bereitstellen, desto genauer wird die Erkennung. Die Verarbeitung natürlicher Sprache ist ein faszinierendes Studiengebiet.',
      'Dies ist ein umfassender Test des Spracherkennungssystems, das wir entwickelt haben. Das System verwendet fortschrittliche Algorithmen, um die Sprache eines beliebigen Textes zu identifizieren. Es unterstützt mehrere Sprachen, darunter Englisch, Spanisch, Französisch, Deutsch und Portugiesisch. Die Erkennungsgenauigkeit verbessert sich mit längeren Textproben.',
      'Die Verarbeitung natürlicher Sprache ermöglicht es Computern, menschlichen Text auf sinnvolle Weise zu verstehen. Diese Technologie hat die Art und Weise revolutioniert, wie wir mit Maschinen interagieren, und hat viele Anwendungen ermöglicht. Von Chatbots bis hin zu Übersetzungsdiensten ist die Verarbeitung natürlicher Sprache überall in unserem täglichen Leben.',
    ],
    pt: [
      'A rápida raposa marrom salta sobre o cão preguiçoso perto do rio. Esta frase contém muitas palavras e frases comuns em português que ajudam na detecção do idioma. Quanto mais texto fornecermos, mais precisa será a detecção. O processamento de linguagem natural é um campo de estudo fascinante.',
      'Este é um teste abrangente do sistema de detecção de idiomas que construímos. O sistema usa algoritmos avançados para identificar o idioma de qualquer texto fornecido. Ele suporta vários idiomas, incluindo inglês, espanhol, francês, alemão e português. A precisão da detecção melhora com amostras de texto mais longas.',
      'O processamento de linguagem natural permite que os computadores entendam o texto humano de maneiras significativas. Esta tecnologia revolucionou a forma como interagimos com as máquinas e possibilitou muitas aplicações. De chatbots a serviços de tradução, o processamento de linguagem natural está em toda parte em nossas vidas diárias.',
    ],
  };

  // Arbitrary generator for supported language texts
  const supportedLanguageTextArb = fc.constantFrom(...SUPPORTED_LANGUAGES).chain((lang) => {
    const samples = languageSamples[lang] || languageSamples['en'];
    return fc.constantFrom(...samples).map((text) => ({ language: lang, text }));
  });

  it('should detect supported languages automatically (Property 24)', () => {
    /**
     * **Feature: ai-humanizer, Property 24: Language detection**
     * **Validates: Requirements 8.1, 8.4**
     * 
     * For any text in a supported language (English, Spanish, French, German, Portuguese)
     * with sufficient length for reliable detection, the language detector should:
     * 1. Detect the language automatically
     * 2. Mark the language as supported
     */
    fc.assert(
      fc.property(supportedLanguageTextArb, ({ language, text }) => {
        const result = detectLanguage(text);
        
        // The detected language should be marked as supported
        // (Requirements 8.4: support at least en, es, fr, de, pt)
        expect(result.isSupported).toBe(true);
        
        // The confidence should be above the threshold for reliable detection
        expect(result.confidence).toBeGreaterThan(0);
        
        // The detected language should be one of the supported languages
        expect(SUPPORTED_LANGUAGES).toContain(result.language);
      }),
      { numRuns: 100 }
    );
  });

  it('should support all five required languages (Property 24 - coverage)', () => {
    /**
     * **Feature: ai-humanizer, Property 24: Language detection**
     * **Validates: Requirements 8.4**
     * 
     * The system SHALL support at least English, Spanish, French, German, and Portuguese.
     */
    const requiredLanguages = ['en', 'es', 'fr', 'de', 'pt'];
    
    fc.assert(
      fc.property(fc.constantFrom(...requiredLanguages), (lang) => {
        // Each required language should be in the supported languages list
        expect(isLanguageSupported(lang)).toBe(true);
        expect(SUPPORTED_LANGUAGES).toContain(lang);
      }),
      { numRuns: 100 }
    );
  });

  it('should return consistent results for same language texts (Property 24 - consistency)', () => {
    /**
     * **Feature: ai-humanizer, Property 24: Language detection**
     * **Validates: Requirements 8.1**
     * 
     * For any two texts in the same supported language, both should be detected
     * as the same language and both should be marked as supported.
     */
    const sameLanguageTextsArb = fc.constantFrom(...SUPPORTED_LANGUAGES).chain((lang) => {
      const samples = languageSamples[lang] || languageSamples['en'];
      return fc.tuple(
        fc.constantFrom(...samples),
        fc.constantFrom(...samples)
      ).map(([text1, text2]) => ({ language: lang, text1, text2 }));
    });

    fc.assert(
      fc.property(sameLanguageTextsArb, ({ text1, text2 }) => {
        const result1 = detectLanguage(text1);
        const result2 = detectLanguage(text2);
        
        // Both texts should be detected as supported
        expect(result1.isSupported).toBe(true);
        expect(result2.isSupported).toBe(true);
        
        // Both should have the same detected language
        expect(result1.language).toBe(result2.language);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Unsupported Language Handling
 * **Feature: ai-humanizer, Property 26: Unsupported language handling**
 * **Validates: Requirements 8.3**
 * 
 * Property: For any text in an unsupported language, the system should
 * return an error message listing all supported languages.
 */
describe('Unsupported Language Handling Property Tests', () => {
  // Sample texts for unsupported languages (must be sufficiently long for reliable detection)
  const unsupportedLanguageSamples: Record<string, string[]> = {
    ja: [
      'これは日本語のテキストです。言語検出のテストに使用されます。このテキストは十分な長さがあり、言語検出アルゴリズムが正確に日本語を識別できるようになっています。自然言語処理は非常に興味深い分野です。',
      '日本語は複雑な言語であり、ひらがな、カタカナ、漢字の三種類の文字体系を使用します。この文章は言語検出システムのテストのために書かれています。正確な検出のためには十分な長さのテキストが必要です。',
      '人工知能と機械学習は現代のテクノロジーにおいて重要な役割を果たしています。言語検出は自然言語処理の基本的なタスクの一つです。このテキストは日本語で書かれており、サポートされていない言語として検出されるべきです。',
    ],
    zh: [
      '这是一段中文文本，用于测试语言检测功能。这段文字足够长，可以让语言检测算法准确识别中文。自然语言处理是一个非常有趣的研究领域，它使计算机能够理解人类语言。',
      '中文是世界上使用人数最多的语言之一。这段文字是为了测试语言检测系统而编写的。准确的语言检测需要足够长度的文本样本。机器学习技术在语言处理中发挥着重要作用。',
      '人工智能技术正在改变我们的生活方式。语言检测是自然语言处理的基础任务之一。这段中文文本应该被检测为不支持的语言，并且系统应该返回支持的语言列表。',
    ],
    ru: [
      'Это текст на русском языке, который используется для тестирования определения языка. Этот текст достаточно длинный, чтобы алгоритм определения языка мог точно идентифицировать русский язык. Обработка естественного языка является очень интересной областью исследований.',
      'Русский язык является одним из самых распространенных языков в мире. Этот текст написан для тестирования системы определения языка. Для точного определения языка требуется достаточно длинный образец текста.',
      'Искусственный интеллект и машинное обучение играют важную роль в современных технологиях. Определение языка является одной из основных задач обработки естественного языка. Этот текст на русском языке должен быть определен как неподдерживаемый язык.',
    ],
    ar: [
      'هذا نص باللغة العربية يستخدم لاختبار اكتشاف اللغة. هذا النص طويل بما يكفي لخوارزمية اكتشاف اللغة لتحديد اللغة العربية بدقة. معالجة اللغة الطبيعية هي مجال بحث مثير للاهتمام للغاية.',
      'اللغة العربية هي واحدة من أكثر اللغات انتشارا في العالم. تمت كتابة هذا النص لاختبار نظام اكتشاف اللغة. يتطلب الاكتشاف الدقيق للغة عينة نصية طويلة بما فيه الكفاية.',
      'يلعب الذكاء الاصطناعي والتعلم الآلي دورا مهما في التكنولوجيا الحديثة. اكتشاف اللغة هو أحد المهام الأساسية في معالجة اللغة الطبيعية. يجب اكتشاف هذا النص العربي كلغة غير مدعومة.',
    ],
    ko: [
      '이것은 언어 감지 테스트에 사용되는 한국어 텍스트입니다. 이 텍스트는 언어 감지 알고리즘이 한국어를 정확하게 식별할 수 있을 만큼 충분히 깁니다. 자연어 처리는 매우 흥미로운 연구 분야입니다.',
      '한국어는 세계에서 가장 널리 사용되는 언어 중 하나입니다. 이 텍스트는 언어 감지 시스템을 테스트하기 위해 작성되었습니다. 정확한 언어 감지를 위해서는 충분히 긴 텍스트 샘플이 필요합니다.',
      '인공지능과 기계학습은 현대 기술에서 중요한 역할을 합니다. 언어 감지는 자연어 처리의 기본 작업 중 하나입니다. 이 한국어 텍스트는 지원되지 않는 언어로 감지되어야 합니다.',
    ],
    it: [
      'Questo è un testo in italiano utilizzato per testare il rilevamento della lingua. Questo testo è abbastanza lungo da permettere all algoritmo di rilevamento della lingua di identificare accuratamente l italiano. L elaborazione del linguaggio naturale è un campo di ricerca molto interessante.',
      'L italiano è una delle lingue più belle del mondo. Questo testo è stato scritto per testare il sistema di rilevamento della lingua. Per un rilevamento accurato della lingua è necessario un campione di testo sufficientemente lungo.',
      'L intelligenza artificiale e l apprendimento automatico svolgono un ruolo importante nella tecnologia moderna. Il rilevamento della lingua è uno dei compiti fondamentali nell elaborazione del linguaggio naturale. Questo testo italiano dovrebbe essere rilevato come lingua non supportata.',
    ],
  };

  // Unsupported language codes
  const unsupportedLanguages = ['ja', 'zh', 'ru', 'ar', 'ko', 'it'];

  // Arbitrary generator for unsupported language texts
  const unsupportedLanguageTextArb = fc.constantFrom(...unsupportedLanguages).chain((lang) => {
    const samples = unsupportedLanguageSamples[lang];
    return fc.constantFrom(...samples).map((text) => ({ language: lang, text }));
  });

  it('should return supported languages list for unsupported language text (Property 26)', () => {
    /**
     * **Feature: ai-humanizer, Property 26: Unsupported language handling**
     * **Validates: Requirements 8.3**
     * 
     * For any text in an unsupported language with sufficient length for detection,
     * the language detector should:
     * 1. Mark the language as NOT supported (isSupported = false)
     * 2. Return a list of all supported languages
     * 3. The supported languages list should contain all 5 required languages (en, es, fr, de, pt)
     */
    fc.assert(
      fc.property(unsupportedLanguageTextArb, ({ text }) => {
        const result = detectLanguage(text);
        
        // The detected language should NOT be supported (Requirements 8.3)
        expect(result.isSupported).toBe(false);
        
        // The result should include the list of supported languages (Requirements 8.3)
        expect(result.supportedLanguages).toBeDefined();
        expect(Array.isArray(result.supportedLanguages)).toBe(true);
        
        // The supported languages list should contain all 5 required languages
        const requiredLanguages = ['en', 'es', 'fr', 'de', 'pt'];
        for (const lang of requiredLanguages) {
          expect(result.supportedLanguages).toContain(lang);
        }
        
        // The supported languages list should have exactly 5 languages
        expect(result.supportedLanguages).toHaveLength(5);
      }),
      { numRuns: 100 }
    );
  });

  it('should consistently mark unsupported languages across multiple detections (Property 26 - consistency)', () => {
    /**
     * **Feature: ai-humanizer, Property 26: Unsupported language handling**
     * **Validates: Requirements 8.3**
     * 
     * For any two texts in the same unsupported language, both should be
     * consistently marked as unsupported and return the same supported languages list.
     */
    const sameUnsupportedLanguageTextsArb = fc.constantFrom(...unsupportedLanguages).chain((lang) => {
      const samples = unsupportedLanguageSamples[lang];
      return fc.tuple(
        fc.constantFrom(...samples),
        fc.constantFrom(...samples)
      ).map(([text1, text2]) => ({ language: lang, text1, text2 }));
    });

    fc.assert(
      fc.property(sameUnsupportedLanguageTextsArb, ({ text1, text2 }) => {
        const result1 = detectLanguage(text1);
        const result2 = detectLanguage(text2);
        
        // Both texts should be marked as unsupported
        expect(result1.isSupported).toBe(false);
        expect(result2.isSupported).toBe(false);
        
        // Both should return the supported languages list
        expect(result1.supportedLanguages).toBeDefined();
        expect(result2.supportedLanguages).toBeDefined();
        
        // The supported languages lists should be identical
        expect(result1.supportedLanguages).toEqual(result2.supportedLanguages);
      }),
      { numRuns: 100 }
    );
  });

  it('should not include unsupported language in supported languages list (Property 26 - exclusion)', () => {
    /**
     * **Feature: ai-humanizer, Property 26: Unsupported language handling**
     * **Validates: Requirements 8.3**
     * 
     * For any text in an unsupported language, the detected language code
     * should NOT appear in the supported languages list.
     */
    fc.assert(
      fc.property(unsupportedLanguageTextArb, ({ language, text }) => {
        const result = detectLanguage(text);
        
        // The detected language should not be in the supported languages list
        if (result.supportedLanguages) {
          expect(result.supportedLanguages).not.toContain(language);
        }
        
        // The language should not be marked as supported
        expect(result.isSupported).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Document Parsing', () => {
  it('should count words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('This is a test sentence.')).toBe(5);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('should extract sentences correctly', () => {
    const text = 'This is the first sentence. This is the second sentence. And this is the third.';
    const sentences = extractSentences(text);
    
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toContain('first sentence');
  });

  it('should parse plain text document structure', () => {
    const text = `Chapter 1: Introduction

This is the first paragraph with some content.

This is the second paragraph with more content.`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('plain');
    expect(structure.paragraphCount).toBeGreaterThan(0);
    expect(structure.wordCount).toBeGreaterThan(0);
  });

  it('should detect markdown format', () => {
    const text = `# Heading 1

This is a paragraph with **bold** text.

## Heading 2

Another paragraph here.`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('markdown');
  });

  it('should detect HTML format', () => {
    const text = `<h1>Title</h1>
<p>This is a paragraph.</p>
<p>Another paragraph.</p>`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('html');
  });

  it('should detect chapter boundaries', () => {
    const text = `Chapter 1: The Beginning

Some content here.

Chapter 2: The Middle

More content here.`;

    const structure = parseDocument(text);
    
    expect(structure.chapterCount).toBe(2);
  });
});

describe('Metrics Calculation', () => {
  it('should calculate burstiness score', () => {
    // Varied sentence lengths should have higher burstiness
    const variedLengths = [5, 15, 3, 20, 8, 25, 4, 18];
    const uniformLengths = [10, 10, 10, 10, 10, 10, 10, 10];
    
    const variedBurstiness = calculateBurstiness(variedLengths);
    const uniformBurstiness = calculateBurstiness(uniformLengths);
    
    expect(variedBurstiness).toBeGreaterThan(uniformBurstiness);
    expect(variedBurstiness).toBeGreaterThanOrEqual(0);
    expect(variedBurstiness).toBeLessThanOrEqual(1);
  });

  it('should calculate lexical diversity', () => {
    // Text with more unique words should have higher diversity
    const diverseText = 'The quick brown fox jumps over the lazy dog near the river bank.';
    const repetitiveText = 'The the the the the the the the the the the the.';
    
    const diverseScore = calculateLexicalDiversity(diverseText);
    const repetitiveScore = calculateLexicalDiversity(repetitiveText);
    
    expect(diverseScore).toBeGreaterThan(repetitiveScore);
    expect(diverseScore).toBeGreaterThan(0);
    expect(diverseScore).toBeLessThanOrEqual(1);
  });

  it('should calculate complete metrics', () => {
    const text = `This is a short sentence. This is a much longer sentence with many more words in it. 
    Short again. Here we have another sentence that varies in length from the others.
    And finally, one more sentence to round things out nicely.`;
    
    const metrics = calculateMetrics(text);
    
    expect(metrics.perplexity).toBeGreaterThan(0);
    expect(metrics.burstiness).toBeGreaterThanOrEqual(0);
    expect(metrics.lexicalDiversity).toBeGreaterThan(0);
    expect(metrics.averageSentenceLength).toBeGreaterThan(0);
    expect(metrics.sentenceLengths.length).toBeGreaterThan(0);
  });

  it('should handle empty text', () => {
    const metrics = calculateMetrics('');
    
    expect(metrics.perplexity).toBe(0);
    expect(metrics.burstiness).toBe(0);
    expect(metrics.lexicalDiversity).toBe(0);
  });
});


describe('Protected Segment Parsing', () => {
  it('should parse protected segments with double brackets', () => {
    const text = 'This is normal text [[protected content]] and more normal text.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].content).toBe('protected content');
    expect(segments[0].openDelimiter).toBe('[[');
    expect(segments[0].closeDelimiter).toBe(']]');
  });

  it('should parse protected segments with curly braces', () => {
    const text = 'Normal text {{protected}} more text.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].content).toBe('protected');
  });

  it('should parse multiple protected segments', () => {
    const text = 'Text [[first]] middle {{second}} end.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(2);
    expect(segments[0].content).toBe('first');
    expect(segments[1].content).toBe('second');
  });

  it('should extract text with placeholders', () => {
    const text = 'Normal [[protected]] text.';
    const segments = parseProtectedSegments(text);
    const { processedText, placeholderMap } = extractWithPlaceholders(text, segments);
    
    expect(processedText).toContain('__PROTECTED_0__');
    expect(processedText).not.toContain('[[protected]]');
    expect(placeholderMap.size).toBe(1);
  });

  it('should restore protected segments from placeholders', () => {
    const text = 'Normal [[protected]] text.';
    const segments = parseProtectedSegments(text);
    const { processedText, placeholderMap } = extractWithPlaceholders(text, segments);
    const restored = restoreProtectedSegments(processedText, placeholderMap);
    
    expect(restored).toContain('protected');
  });

  it('should validate mismatched delimiters', () => {
    const text = 'Text [[unclosed segment here.';
    const validation = validateProtectedSegments(text);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle text with no protected segments', () => {
    const text = 'This is just normal text without any protected segments.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(0);
  });
});

describe('TextAnalyzer', () => {
  it('should perform complete analysis', () => {
    const analyzer = new TextAnalyzer();
    const text = `This is a sample text for analysis. It contains multiple sentences with varying lengths.
    Some sentences are short. Others are much longer and contain more words to create variation.
    The analyzer should detect the language, parse the structure, and calculate metrics.`;
    
    const result = analyzer.analyze(text);
    
    expect(result.isValid).toBe(true);
    expect(result.language.language).toBe('en');
    expect(result.language.isSupported).toBe(true);
    expect(result.structure.wordCount).toBeGreaterThan(0);
    expect(result.structure.sentenceCount).toBeGreaterThan(0);
    expect(result.metrics.perplexity).toBeGreaterThan(0);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('should reject empty input', () => {
    const analyzer = new TextAnalyzer();
    const result = analyzer.analyze('');
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it('should reject whitespace-only input', () => {
    const analyzer = new TextAnalyzer();
    const result = analyzer.analyze('   \n\t   ');
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Input text cannot be empty or whitespace-only');
  });

  it('should detect content type', () => {
    const analyzer = new TextAnalyzer();
    
    // Academic text
    const academicText = `The hypothesis was tested using empirical methods. 
    According to Smith et al. (2020), the results support the theoretical framework.
    The methodology section describes the analysis in detail.`;
    const academicResult = analyzer.analyze(academicText);
    expect(academicResult.contentType).toBe('academic');
    
    // Technical text
    const technicalText = `The API endpoint accepts JSON payloads. 
    The function implementation uses async/await patterns.
    Configure the module parameters in the configuration file.`;
    const technicalResult = analyzer.analyze(technicalText);
    expect(technicalResult.contentType).toBe('technical');
  });

  it('should use analyzeText convenience function', () => {
    const text = 'This is a simple test text for the convenience function to analyze.';
    const result = analyzeText(text);
    
    expect(result.isValid).toBe(true);
    expect(result.language.language).toBe('en');
  });

  it('should respect maxWordCount option', () => {
    const analyzer = new TextAnalyzer({ maxWordCount: 10 });
    const text = 'This is a text with more than ten words in it for testing purposes.';
    const result = analyzer.analyze(text);
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors.some(e => e.includes('exceeds maximum word count'))).toBe(true);
  });

  it('should skip metrics when option is set', () => {
    const analyzer = new TextAnalyzer({ skipMetrics: true });
    const text = 'This is a test text for skipping metrics calculation.';
    const result = analyzer.analyze(text);
    
    expect(result.metrics.perplexity).toBe(0);
    expect(result.metrics.burstiness).toBe(0);
  });

  it('should identify protected segments in analysis', () => {
    const analyzer = new TextAnalyzer();
    const text = 'Normal text [[protected term]] and more text {{another protected}}.';
    const result = analyzer.analyze(text);
    
    expect(result.protectedSegments).toHaveLength(2);
    expect(result.protectedSegments[0].content).toBe('protected term');
  });
});

/**
 * Property-Based Tests for Ambiguous Language Handling
 * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
 * **Validates: Requirements 8.5**
 * 
 * Property: For any text where language detection confidence is below the threshold,
 * the system should indicate uncertainty and provide the list of supported languages
 * so the user can specify the language.
 */
describe('Ambiguous Language Handling Property Tests', () => {
  // Texts that are ambiguous or too short for reliable detection
  // These should result in low confidence scores
  const ambiguousTexts = [
    // Very short texts (below MIN_TEXT_LENGTH of 20 chars)
    'Hi there',
    'Hello',
    'Yes no maybe',
    'OK',
    'Test',
    // Mixed language texts (should reduce confidence due to multiple scripts)
    'Hello world こんにちは 你好',
    'Bonjour hello hola ciao',
    'The quick fox 狐狸 jumps',
    // Texts with multiple scripts that trigger detectMultipleScripts
    'Hello мир world',
    'Test テスト testing',
    'Data 数据 information',
    // Gibberish or random characters
    'asdf jkl qwerty zxcv',
    'xyz abc def ghi jkl',
  ];

  // Generator for ambiguous texts
  const ambiguousTextArb = fc.constantFrom(...ambiguousTexts);

  // Generator for very short texts (guaranteed to be below MIN_TEXT_LENGTH)
  const veryShortTextArb = fc.string({ minLength: 1, maxLength: 15 });

  // Generator for mixed-script texts (Latin + CJK)
  const mixedScriptTextArb = fc.tuple(
    fc.string({ minLength: 5, maxLength: 20 }),
    fc.constantFrom('你好', '世界', 'こんにちは', '日本語', '한국어', '안녕')
  ).map(([latin, cjk]) => `${latin} ${cjk} ${latin}`);

  it('should return low confidence for very short texts (Property 27)', () => {
    /**
     * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
     * **Validates: Requirements 8.5**
     * 
     * For any text that is too short for reliable detection (below MIN_TEXT_LENGTH),
     * the system should return low confidence (0) and mark language as unknown,
     * indicating the user should specify the language.
     */
    fc.assert(
      fc.property(veryShortTextArb, (text) => {
        const result = detectLanguage(text);
        
        // Very short texts should have zero confidence
        expect(result.confidence).toBe(0);
        
        // Language should be marked as unknown
        expect(result.language).toBe('unknown');
        
        // Should not be marked as supported (user needs to specify)
        expect(result.isSupported).toBe(false);
        
        // Should provide list of supported languages for user to choose from
        expect(result.supportedLanguages).toBeDefined();
        expect(result.supportedLanguages).toContain('en');
        expect(result.supportedLanguages).toContain('es');
        expect(result.supportedLanguages).toContain('fr');
        expect(result.supportedLanguages).toContain('de');
        expect(result.supportedLanguages).toContain('pt');
      }),
      { numRuns: 100 }
    );
  });

  it('should return reduced confidence for mixed-script texts (Property 27)', () => {
    /**
     * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
     * **Validates: Requirements 8.5**
     * 
     * For any text containing multiple writing scripts (e.g., Latin + CJK),
     * the system should reduce confidence as the language is ambiguous.
     * This signals that the user should specify the language.
     */
    fc.assert(
      fc.property(mixedScriptTextArb, (text) => {
        const result = detectLanguage(text);
        
        // Mixed script texts should have reduced confidence
        // The detectMultipleScripts function reduces confidence by 0.2
        // Combined with other factors, confidence should be lower than high-confidence threshold
        expect(result.confidence).toBeLessThan(0.8);
      }),
      { numRuns: 100 }
    );
  });

  it('should provide supported languages list when confidence is low (Property 27)', () => {
    /**
     * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
     * **Validates: Requirements 8.5**
     * 
     * For any ambiguous text (low confidence detection), the system should
     * provide the list of supported languages so the user can specify the correct language.
     */
    fc.assert(
      fc.property(ambiguousTextArb, (text) => {
        const result = detectLanguage(text);
        
        // For ambiguous texts, if confidence is low or language is unknown/unsupported,
        // the system should provide supported languages list
        if (result.confidence < 0.5 || !result.isSupported || result.language === 'unknown') {
          expect(result.supportedLanguages).toBeDefined();
          expect(Array.isArray(result.supportedLanguages)).toBe(true);
          expect(result.supportedLanguages!.length).toBe(5);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty and whitespace-only input as ambiguous (Property 27)', () => {
    /**
     * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
     * **Validates: Requirements 8.5**
     * 
     * Empty or whitespace-only input should be treated as ambiguous,
     * returning zero confidence and prompting user to specify language.
     */
    const emptyOrWhitespaceArb = fc.constantFrom('', '   ', '\t', '\n', '  \n  \t  ');

    fc.assert(
      fc.property(emptyOrWhitespaceArb, (text) => {
        const result = detectLanguage(text);
        
        // Empty/whitespace should have zero confidence
        expect(result.confidence).toBe(0);
        
        // Language should be unknown
        expect(result.language).toBe('unknown');
        
        // Should not be supported
        expect(result.isSupported).toBe(false);
        
        // Should provide supported languages for user selection
        expect(result.supportedLanguages).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should consistently indicate ambiguity for same ambiguous input (Property 27 - consistency)', () => {
    /**
     * **Feature: ai-humanizer, Property 27: Ambiguous language handling**
     * **Validates: Requirements 8.5**
     * 
     * For any ambiguous text, multiple detections should return consistent results,
     * ensuring the user gets the same indication to specify the language.
     */
    fc.assert(
      fc.property(ambiguousTextArb, (text) => {
        const result1 = detectLanguage(text);
        const result2 = detectLanguage(text);
        
        // Results should be identical for the same input
        expect(result1.language).toBe(result2.language);
        expect(result1.confidence).toBe(result2.confidence);
        expect(result1.isSupported).toBe(result2.isSupported);
        
        // If supported languages are provided, they should be the same
        if (result1.supportedLanguages && result2.supportedLanguages) {
          expect(result1.supportedLanguages).toEqual(result2.supportedLanguages);
        }
      }),
      { numRuns: 100 }
    );
  });
});
