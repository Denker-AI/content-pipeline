declare module 'text-readability' {
  interface Readability {
    charCount(text: string, ignoreSpaces?: boolean): number
    letterCount(text: string, ignoreSpaces?: boolean): number
    lexiconCount(text: string, removePunctuation?: boolean): number
    syllableCount(text: string, lang?: string): number
    sentenceCount(text: string): number
    averageSentenceLength(text: string): number
    averageSyllablePerWord(text: string): number
    fleschReadingEase(text: string): number
    fleschKincaidGrade(text: string): number
    smogIndex(text: string): number
    colemanLiauIndex(text: string): number
    automatedReadabilityIndex(text: string): number
    daleChallReadabilityScore(text: string): number
    gunningFog(text: string): number
    textStandard(text: string, floatOutput?: boolean): string | number
    textMedian(text: string): number
  }
  const readability: Readability
  export default readability
}
