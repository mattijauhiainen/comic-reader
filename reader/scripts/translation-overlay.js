import { getSpacing, getElementHeight } from "./spacing-utils.js";

/**
 * TranslationOverlayManager
 * Manages the display of translation overlays with smart positioning
 */

export class TranslationOverlayManager {
  constructor(navigator) {
    this.navigator = navigator; // Reference to PanelNavigator for navigation callbacks
    this.overlayElement = null;
    this.isVisible = false;
    this.currentTranslation = null;
    this.currentBubbleBounds = null;
    this.dismissHandler = null;
    this.escapeHandler = null;
    this.resizeHandler = null;
  }

  /**
   * Show the translation overlay
   * @param {Object} translation - Translation data
   * @param {DOMRect} bubbleBounds - Screen position of the clicked bubble
   */
  show(translation, bubbleBounds) {
    // The current bubble is hiding. If it is the same bubble, don't open it
    // again.
    if (this.isSameBubble(bubbleBounds)) {
      return;
    }

    // If already showing a different translation, hide it first
    if (this.isVisible) {
      this.hide();
    }

    this.currentTranslation = translation;
    this.currentBubbleBounds = bubbleBounds;

    // Build overlay content
    this.overlayElement = this.buildOverlay(translation);
    document.body.appendChild(this.overlayElement);

    // Position the overlay before making it visible
    this.positionOverlay(bubbleBounds);

    // Wait a frame to ensure the browser renders the initial state
    // before adding the visible class, so the CSS transition fires
    requestAnimationFrame(() => {
      // Make overlay visible with animation
      this.overlayElement.classList.add("visible");
      this.isVisible = true;

      // Setup dismissal handlers
      this.setupDismissalHandlers();
    });
  }

  /**
   * Hide the translation overlay
   */
  hide() {
    if (!this.isVisible || !this.overlayElement) {
      return;
    }

    // Remove visible class for fade-out animation
    this.overlayElement.classList.remove("visible");

    // Clean up event listeners
    this.removeDismissalHandlers();

    // Wait for animation to complete before removing and resetting state
    const handleTransitionEnd = (e) => {
      if (e.target === this.overlayElement) {
        if (this.overlayElement?.parentNode) {
          this.overlayElement.parentNode.removeChild(this.overlayElement);
        }
        this.overlayElement = null;

        // Reset state after transition completes
        this.isVisible = false;
        this.currentTranslation = null;
        this.currentBubbleBounds = null;
      }
    };

    this.overlayElement.addEventListener("transitionend", handleTransitionEnd, {
      once: true,
    });
  }

  /**
   * Check if the given bounds represent the same bubble as currently shown
   */
  isSameBubble(bubbleBounds) {
    if (!this.currentBubbleBounds) {
      return false;
    }

    // Compare bubble positions to determine if it's the same bubble
    return (
      this.currentBubbleBounds.top === bubbleBounds.top &&
      this.currentBubbleBounds.left === bubbleBounds.left &&
      this.currentBubbleBounds.width === bubbleBounds.width &&
      this.currentBubbleBounds.height === bubbleBounds.height
    );
  }

  /**
   * Build the overlay DOM structure
   */
  buildOverlay(translation) {
    const overlay = document.createElement("div");
    overlay.className = "translation-overlay";
    overlay.id = "translation-overlay";

    const content = document.createElement("div");
    content.className = "translation-content";

    const result = translation.translation_result;

    // Render each sentence with vocabulary and grammar
    if (result.sentences && result.sentences.length > 0) {
      result.sentences.forEach((sentence, index) => {
        const sentenceBlock = this.buildSentenceBlock(sentence, index);
        content.appendChild(sentenceBlock);
      });
    }

    // Add full translation at the end
    const fullTranslation = this.buildFullTranslation(result.translation);
    content.appendChild(fullTranslation);

    overlay.appendChild(content);
    return overlay;
  }

  /**
   * Build a sentence block with vocabulary and grammar
   */
  buildSentenceBlock(sentence, index) {
    const block = document.createElement("div");
    block.className = "sentence-block";

    // Sentence text (Chinese and English)
    const sentenceText = document.createElement("div");
    sentenceText.className = "sentence-text";

    const chinese = document.createElement("span");
    chinese.className = "chinese";
    chinese.textContent = sentence.chinese_text;

    const english = document.createElement("span");
    english.className = "english";
    english.textContent = sentence.english_translation;

    sentenceText.appendChild(chinese);
    sentenceText.appendChild(english);
    block.appendChild(sentenceText);

    // Vocabulary section
    if (sentence.vocabulary && sentence.vocabulary.length > 0) {
      const vocabSection = document.createElement("div");
      vocabSection.className = "vocabulary-section";

      const vocabHeading = document.createElement("h3");
      vocabHeading.textContent = "Vocabulary";
      vocabSection.appendChild(vocabHeading);

      const vocabList = document.createElement("ul");
      vocabList.className = "vocabulary-list";

      for (const vocab of sentence.vocabulary) {
        const item = document.createElement("li");

        const word = document.createElement("span");
        word.className = "vocab-word";
        word.textContent = vocab.word;

        const romanization = document.createElement("span");
        romanization.className = "vocab-romanization";
        romanization.textContent = `(${vocab.romanization})`;

        const translation = document.createElement("span");
        translation.className = "vocab-translation";
        translation.textContent = vocab.translation;

        item.appendChild(word);
        item.appendChild(romanization);
        item.appendChild(translation);
        vocabList.appendChild(item);
      }

      vocabSection.appendChild(vocabList);
      block.appendChild(vocabSection);
    }

    // Grammar section (if present)
    if (sentence.grammar_points && sentence.grammar_points.length > 0) {
      const grammarSection = document.createElement("div");
      grammarSection.className = "grammar-section";

      const grammarHeading = document.createElement("h3");
      grammarHeading.textContent = "Grammar";
      grammarSection.appendChild(grammarHeading);

      for (const point of sentence.grammar_points) {
        const grammarPoint = document.createElement("div");
        grammarPoint.className = "grammar-point";

        const pattern = document.createElement("div");
        pattern.className = "grammar-pattern";
        pattern.textContent = point.pattern;

        const explanation = document.createElement("div");
        explanation.className = "grammar-explanation";
        explanation.textContent = point.explanation;

        const example = document.createElement("div");
        example.className = "grammar-example";
        example.textContent = point.example;

        grammarPoint.appendChild(pattern);
        grammarPoint.appendChild(explanation);
        grammarPoint.appendChild(example);
        grammarSection.appendChild(grammarPoint);
      }

      block.appendChild(grammarSection);
    }

    return block;
  }

  /**
   * Build the full translation section
   */
  buildFullTranslation(translationText) {
    const section = document.createElement("div");
    section.className = "full-translation";

    const heading = document.createElement("h3");
    heading.textContent = "Full Translation";

    const text = document.createElement("p");
    text.textContent = translationText;

    section.appendChild(heading);
    section.appendChild(text);

    return section;
  }

  /**
   * Calculate and apply overlay position
   */
  positionOverlay(bubbleBounds) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const position = this.calculatePosition(bubbleBounds, viewport);

    // Apply position - set all to empty first to clear any previous values
    this.overlayElement.style.top = "";
    this.overlayElement.style.left = "";
    this.overlayElement.style.right = "";
    this.overlayElement.style.bottom = "";

    // Now apply the calculated position
    if (position.top !== "auto") this.overlayElement.style.top = position.top;
    if (position.left !== "auto")
      this.overlayElement.style.left = position.left;
    if (position.right !== "auto")
      this.overlayElement.style.right = position.right;
    if (position.bottom !== "auto")
      this.overlayElement.style.bottom = position.bottom;

    this.overlayElement.style.width = position.width;
    this.overlayElement.style.maxHeight = position.maxHeight;
  }

  /**
   * Calculate optimal overlay position based on viewport and bubble location
   */
  calculatePosition(bubbleBounds, viewport) {
    const SPACING = getSpacing(3);
    const width = `min(calc(100vw - ${SPACING * 2}px), 400px)`;
    const MIN_HEIGHT_PX = 400;

    // Horizontal positioning: center on bubble, but clamp to viewport bounds
    const bubbleHorizontalCenter = bubbleBounds.left + bubbleBounds.width / 2;
    const left = `clamp(
      ${SPACING}px,
      calc(${Math.round(bubbleHorizontalCenter)}px - (${width}) / 2),
      calc(100vw - (${width}) - ${SPACING}px)
    )`;
    const right = "auto";

    // Decide above or below based on bubble position
    const bubbleCenter = bubbleBounds.top + bubbleBounds.height / 2;
    const isTopHalf = bubbleCenter < viewport.height / 2;

    if (isTopHalf) {
      // Position below bubble, but adjust upward if needed to fit minimum height
      // Top has to be at least "safe area" + SPACING
      const minTop = `calc(env(safe-area-inset-top) + ${SPACING}px)`;
      // Ideally we want the top right below the bubble
      const idealTop = `${Math.round(bubbleBounds.bottom + SPACING)}px`;
      // We want to make sure there is at least MIN_HEIGHT_PX of overlay visible.
      // Clamp the top to max value that accommodates for having MIN_HEIGHT_PX
      // and the margins.
      const maxTop = `calc(100dvh - ${MIN_HEIGHT_PX}px - env(safe-area-inset-bottom) - ${SPACING}px)`;
      const top = `clamp(${minTop}, ${idealTop}, ${maxTop})`;

      // Max height: The max height is the full view port minus the top position we just
      // calculated, minus save area and margin
      const maxHeight = `calc(100dvh - ${top} - env(safe-area-inset-bottom) - ${SPACING}px)`;

      return { top, left, right, bottom: "auto", width, maxHeight };
    }

    // Position above bubble, but adjust downward if needed to fit minimum height
    // The bottom has to be at least this high
    const minBottom = `calc(env(safe-area-inset-bottom) + ${SPACING}px)`;
    // Ideally we want the bottom right above the bubble
    const idealBottom = `${Math.round(viewport.height - bubbleBounds.top + SPACING)}px`;
    // We want to make sure there is at least MIN_HEIGHT_PX of overlay visible.
    // Clamp the bottom to max value that accommodtes for having MIN_HEIGHT_PX
    // and the margins.
    const maxBottom = `calc(100dvh - ${MIN_HEIGHT_PX}px - env(safe-area-inset-top) - ${SPACING}px)`;
    const bottom = `clamp(${minBottom}, ${idealBottom}, ${maxBottom})`;

    // Max height: The max height is the full view port minus the bottom position we just
    // claculated, minus save area and margin
    const maxHeight = `calc(100dvh - env(safe-area-inset-top) - ${SPACING}px - ${bottom})`;

    return { top: "auto", left, right, bottom, width, maxHeight };
  }

  /**
   * Setup dismissal event handlers
   */
  setupDismissalHandlers() {
    // Click outside overlay to dismiss
    this.dismissHandler = (e) => {
      if (this.isVisible && !this.overlayElement.contains(e.target)) {
        this.hide();
      }
    };

    // Use capture phase to ensure we get the event first
    setTimeout(() => {
      document.addEventListener("click", this.dismissHandler, {
        capture: true,
      });
    }, 100); // Small delay to prevent immediate dismissal from the click that opened it

    // Escape key to dismiss
    this.escapeHandler = (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener("keydown", this.escapeHandler);

    // Resize handler
    this.resizeHandler = () => {
      if (this.isVisible && this.overlayElement) {
        this.positionOverlay(this.currentBubbleBounds);
      }
    };

    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(this.resizeHandler, 150);
    });
  }

  /**
   * Remove dismissal event handlers
   */
  removeDismissalHandlers() {
    if (this.dismissHandler) {
      document.removeEventListener("click", this.dismissHandler, {
        capture: true,
      });
      this.dismissHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }
    // Note: resize handler cleanup would need a reference to the timeout
  }
}
