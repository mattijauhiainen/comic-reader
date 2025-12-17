// OCR Input Types
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextLine {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text_lines: TextLine[];
  full_text: string;
  avg_confidence: number;
}

export interface Detection {
  label: string;
  label_id: number;
  confidence: number;
  bbox: BoundingBox;
  ocr_result: OcrResult;
}

export interface ImageInfo {
  path: string;
  width: number;
  height: number;
}

export interface OcrConfig {
  lang: string;
  model: string;
  version: string;
  confidence_threshold: number;
}

export interface OcrJson {
  image_info: ImageInfo;
  detections: Detection[];
  ocr_config: OcrConfig;
  source_bubble_file: string;
  processed_at: string;
}

// Anthropic API Types
export interface VocabularyItem {
  word: string;
  translation: string;
  romanization: string;
}

export interface GrammarPoint {
  pattern: string;
  explanation: string;
  example: string;
}

export interface Sentence {
  chinese_text: string;
  english_translation?: string;
  vocabulary: VocabularyItem[];
  grammar_points?: GrammarPoint[];
}

export interface AnthropicResponse {
  chinese_text: string;
  translation: string;
  sentences: Sentence[];
}

// Translation Output Types
export interface ApiMetadata {
  model: string;
  tokens_used: {
    input: number;
    output: number;
  };
}

export interface TranslationResult {
  bbox: BoundingBox;
  original_text: string;
  translation_result: AnthropicResponse;
  api_metadata: ApiMetadata;
}

export interface TranslationMetadata {
  source_ocr_file: string;
  processed_at: string;
  total_bubbles: number;
  translated_bubbles: number;
  skipped_bubbles: number;
  total_tokens: number;
}

export interface TranslationJson {
  image_info: ImageInfo;
  translations: TranslationResult[];
  metadata: TranslationMetadata;
}

// CLI Types
export interface CliArgs {
  input: string;
  output?: string;
  album?: string;
  model?: string;
}
