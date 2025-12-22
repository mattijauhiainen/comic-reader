# Comic Reader

A web-based comic book reader designed for panel-by-panel reading with translation support.

## What is this?

This project creates a web reader for reading comic books in a foreign language. The reader browses the comic book panel-by-panel with support for translating the text on the panel into English. The reader is designed for me to practise my Chinese reading, mostly on my phone.

## How it works

The project consists of two main parts:

### 1. Processing Pipeline

A set of tools that analyze comic book pages to extract structural and textual information:

- **Panel Extractor** - Identifies and maps the bounding boxes of each panel on a page using contouring
- **Bubble Extractor** - Detects text bubbles and captions within the artwork using RT-DETR-v2 model
- **OCR** - Reads the Chinese text from detected bubbles using PaddleOCR
- **Translator** - Translates the extracted text and provides vocabulary and grammar notes using Anthropic API

### 2. Web Reader

A web interface that uses the extracted data to create a guided reading experience:

- Displays comic pages with panel-by-panel navigation
- Shows translations and learning materials as overlays when you click on text bubbles
- Presents vocabulary with Jyutping romanization and individual word translations
- Highlights relevant grammar patterns with examples

The web interface is a static site which is generated with TypeScript.

The reader is hosted at [https://tintincomics.netlify.app](https://tintincomics.netlify.app)

## Why

- **Why did I build this?**: Mostly for fun, but also to be able to more conveniently read comics that are above my level of Chinese comprehension.
- **Why did I use Jyutping and not Pinyin?**: I study Cantonese which is often romanized with Jyutping.
