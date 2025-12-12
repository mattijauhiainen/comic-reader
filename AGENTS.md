# Comics

Comics project is a project to build web reader for comic books. It has two parts, the website which renders comic pages, and tooling which will get the necessary metadata from the comics for rendering.

## Comics web reader

The web reader renders a single comic album. Each page of the comic album is a single image file. The reader will initially render the first page of the album in full. 

When user triggers the next action, the reader will zoom in on that page to the first panel of the page. When user triggers the next action again, reader will zoom to the next panel. When user triggers next action on the last panel of the page, reader will load in next page, and displays the next page in full.

## Tooling

### panelExtractor

To support the reader, for each page, we need to find the bounding boxes of all the panels on that page. The `panelExtractor` contains a typescript program that can do this.

Panel extractor will take as an input a path to an image file, and as an output will produce a JSON file which contains bounding boxes of each panel in that image file.

To extract panels from a comic page:
```bash
cd panelExtractor
bun run extract <input-image>
```

Options:
- `-o, --output <path>`: Specify output JSON file path (default: same name as input with .json extension)
- `--debug`: Generate debug visualization showing detected panels
- `--min-panel-size <pixels>`: Minimum panel dimension in pixels (default: 300)

Example:
```bash
bun run extract ../assets/pizarro/page1.avif --debug
```

### Static site generator

The generator produces static HTML pages for the web reader. `generate-pages.ts` scans the assets folder for comic pages, generates individual HTML files for each page with navigation, and copies assets to the reader directory. `serve.ts` provides a local development server at port 3000 for testing the generated pages.

To generate static pages:
```bash
bun run generate
```

To run the development server:
```bash
bun run serve
```

Then open http://localhost:3000 in your browser to view the generated pages.

## Development Guidelines

### Code Formatting

After making any code edits to TypeScript/JavaScript files, run the Biome formatter from the root directory:

```bash
bun run format
```

This formats all TypeScript/JavaScript files across all projects (panelExtractor, generator, etc.) using the shared biome.json configuration.
