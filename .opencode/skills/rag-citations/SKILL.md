---
name: rag-citations
description: Use when implementing citation formatting for RAG systems, generating bibliographies in APA/MLA/Chicago styles, managing references from retrieved documents, formatting in-text citations, or creating reference lists from RAG sources
---

# RAG Citations

Academic citation formatting and bibliography generation for RAG (Retrieval-Augmented Generation) systems.

## Overview

Format citations in APA 7th, MLA 9th, and Chicago 17th styles using Citation.js and CSL (Citation Style Language). Integrate citation metadata from RAG retrieval results into properly formatted bibliographies and in-text citations.

## When to Use

- Generating bibliographies from RAG-retrieved documents
- Formatting in-text citations for academic writing
- Converting between citation styles (APA/MLA/Chicago)
- Managing references from vector database metadata
- Creating works-cited lists from search results
- Formatting citations for web sources, journals, books

## Quick Start

### Installation

```bash
npm install @citation-js/core @citation-js/plugin-csl @citation-js/plugin-doi
```

### Basic Usage

```typescript
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";

// From RAG metadata
const ragSource = {
  type: "article-journal",
  title: "Machine Learning in Healthcare",
  author: [{ family: "Smith", given: "John" }],
  issued: { "date-parts": [[2024]] },
  "container-title": "Journal of AI",
  volume: "15",
  page: "123-145",
  DOI: "10.1234/jai.2024.001",
};

const citation = new Cite(ragSource);

// Format as APA
const apa = citation.format("bibliography", {
  format: "text",
  template: "apa",
  lang: "en-US",
});
// Output: Smith, J. (2024). Machine learning in healthcare. Journal of AI, 15, 123-145. https://doi.org/10.1234/jai.2024.001

// Format as MLA
const mla = citation.format("bibliography", {
  format: "text",
  template: "mla",
  lang: "en-US",
});
// Output: Smith, John. "Machine Learning in Healthcare." Journal of AI, vol. 15, 2024, pp. 123-145.
```

## Citation Styles Comparison

| Element     | APA 7th             | MLA 9th        | Chicago 17th (Author-Date) |
| ----------- | ------------------- | -------------- | -------------------------- |
| **Author**  | Last, F. M.         | Last, First M. | Last, First M.             |
| **Date**    | (2024)              | 2024           | 2024                       |
| **Title**   | Sentence case       | Title Case     | Sentence case              |
| **Journal** | _Journal Name_      | _Journal Name_ | _Journal Name_             |
| **In-text** | (Smith, 2024)       | (Smith 123)    | (Smith 2024, 123)          |
| **URL/DOI** | https://doi.org/... | doi:...        | https://doi.org/...        |

## Common Patterns

### 1. RAG Integration Pattern

```typescript
// Convert RAG metadata to CSL-JSON
interface RAGDocument {
  content: string;
  metadata: {
    title: string;
    authors: string[];
    year: number;
    source: string;
    url?: string;
    doi?: string;
  };
}

function ragToCSL(doc: RAGDocument) {
  return {
    type: "webpage",
    title: doc.metadata.title,
    author: doc.metadata.authors.map((name) => {
      const [given, ...family] = name.split(" ");
      return { given, family: family.join(" ") };
    }),
    issued: { "date-parts": [[doc.metadata.year]] },
    URL: doc.metadata.url,
    DOI: doc.metadata.doi,
    "container-title": doc.metadata.source,
  };
}

// Generate bibliography from RAG results
async function generateBibliography(
  docs: RAGDocument[],
  style: "apa" | "mla" | "chicago-author-date" = "apa",
) {
  const cslData = docs.map(ragToCSL);
  const cite = new Cite(cslData);

  return cite.format("bibliography", {
    format: "html",
    template: style,
    lang: "en-US",
  });
}
```

### 2. In-Text Citation Generator

```typescript
function generateInTextCitatiohor: string,
  year: number,
  page?: number,
  style: 'apa' | 'mla' | 'chicago' = 'apa'
): string {
  const lastName = author.split(' ').pop();

  switch (style) {
    case 'apa':
      return page ? `(${lastName}, ${year}, p. ${page})` : `(${lastName}, ${year})`;
    case 'mla':
      return page ? `(${lastName} ${page})` : `(${lastName})`;
    case 'chicago':
      return page ? `(${lastName} ${year}, ${page})` : `(${lastName} ${year})`;
  }
}

// Usage in RAG response
const response = `According to recent research ${generateInTextCitation('John Smith', 2024, 45, 'apa')},
machine learning shows promise in healthcare applications.`;
```

### 3. Multiple Source Types

```typescript
// Journal article
const journalArticle = {
  type: "article-journal",
  title: "Deep learning applications",
  author: [{ family: "Doe", given: "Jane" }],
  "container-title": "AI Review",
  volume: "10",
  issue: "2",
  page: "45-67",
  issued: { "date-parts": [[2024]] },
  DOI: "10.1234/air.2024.002",
};

// Web page
const webpage = {
  type: "webpage",
  title: "Introduction to RAG systems",
  author: [{ family: "Brown", given: "Alice" }],
  URL: "https://excom/rag-intro",
  accessed: { "date-parts": [[2024, 1, 15]] },
  issued: { "date-parts": [[2023, 12, 1]] },
};

// Book
const book = {
  type: "book",
  title: "Artificial intelligence: A modern approach",
  author: [
    { family: "Russell", given: "Stuart" },
    { family: "Norvig", given: "Peter" },
  ],
  publisher: "Pearson",
  "publisher-place": "Upper Saddle River, NJ",
  edition: "4",
  issued: { "date-parts": [[2020]] },
  ISBN: "978-0134610993",
};

// Combine all sources
const allSources = new Cite([journalArticle, webpage, book]);
const bibliography = allSources.format("bibliography", {
  format: "html",
  template: "apa",
});
```

### 4. Batch Processing RAG Results

```typescript
async function processCitationsFromRAG(
  ragResults: RAGDocument[],
  citationStyle: "apa" | "mla" | "chicago-author-date",
) {
  // Deduplicate by DOI or title
  const uniqueSources = new Map<string, any>();

  for (const doc of ragResults) {
    const key = doc.metadata.doi || doc.metadata.title;
    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, ragToCSL(doc));
    }
  }

  // Sort alphabetically by author last name
  const sortedSources = Array.from(uniqueSources.values()).sort((a, b) => {
    const aAuthor = a.author?.[0]?.family || "";
    const bAuthor = b.author?.[0]?.family || "";
    return aAuthor.localeCompare(bAuthor);
  });

  const cite = new Cite(sortedSources);

  return {
    html: cite.format("bibliography", {
      format: "html",
      template: citationStyle,
    }),
    text: cite.format("bibliography", {
      format: "text",
      template: citationStyle,
    }),
    count: sortedSources.length,
  };
}
```

## Quick Reference

### CSL-JSON Required Fields by Type

| Type                                                       | Required Fields                                           |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| **article-journal** author, title, container-title, issued |
| **webpage**                                                | title, URL, accessed                                      |
| **book**                                                   | author, title, publisher, issued                          |
| **chapter**                                                | author, title, container-title, editor, publisher, issued |
| **paper-conference**                                       | author, title, container-title, issued                    |

### Common CSL Types

- `article-journal` - Journal articles
- `article-newspaper` - News articles
- `book` - Books
- `chapter` - Book chapters
- `paper-conference` - Conference papers
- `webpage` - Web pages
- `thesis` - Dissertations/theses
- `report` - Technical reports

### Citation.js Output Formats

```typescript
cite.format("bibliography", {
  format: "html" | "text" | "rtf",
  template: "apa" | "mla" | "chicago-author-date" | "vancouver" | "harvard1",
  lang: "en-US" | "en-GB" | "de-DE" | "fr-FR",
});
```

## Best Practices

1. **Store CSL-JSON in vector DB metadata** - Include complete citation data with embeddings
2. **Validate required fields** - Check CSL-JSON has minimum required fields before formatting
3. **Handle missing data gracefully** - Provide defaults for optional fields (e.g., "n.d." for no date)
4. **Deduplicate sources** - Use DOI or title+author as unique key
5. **Sort bibliographies** - Alphacally by author last name (APA/MLA/Chicago standard)
6. **Include access dates for web sources** - Required for MLA, recommended for APA
7. **Use DOIs when available** - Preferred over URLs for academic sources

## Common Mistakes

- **Wrong CSL type** - Using `webpage` for journal articles (use `article-journal`)
- **Missing author parsing** - Not splitting "First Last" into `{ given, family }`
- **Incorrect date format** - Use `{ 'date-parts': [[year, month, day]] }` not strings
- **Forgetting to load plugins** - Must import `@citation-js/plugin-csl` before formatting
- **Not handling multiple authors** - Author field must be array even for single author
- **Mixing citation styles** - Keep in-text and bibliography in same style

## Resources

- **Citation.js Docs**: https://citation.js.org/api/0.7
- **CSL Specification**: https://citationstyles.org/
- **APA 7th Edition**: https://apastyle.apa.org/
- **MLA 9th Edition**: https://style.mla.org/
- **Chicago 17th Edition**: https://www.chicagomanualofstyle.org/
- **CSL-JSON Schema**: https://github.com/citation-style-language/schema
