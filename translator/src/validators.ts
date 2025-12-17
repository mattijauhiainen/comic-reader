/**
 * Check if text contains Chinese characters
 * Unicode ranges:
 * - \u4E00-\u9FFF: CJK Unified Ideographs (common Chinese characters)
 * - \u3400-\u4DBF: CJK Unified Ideographs Extension A
 */
export function containsChinese(text: string): boolean {
  const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  return chineseRegex.test(text);
}
