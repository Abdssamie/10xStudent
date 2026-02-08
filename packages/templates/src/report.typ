// Report Template
// This template provides a structured format for professional reports

#set document(title: "Report", author: "Author")
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2cm),
  export interface QuerySourcesInput {
    documentId: string;
    query: string;
    limit?: number;
    contextLogger?: Logger;
  }
  
  export interface SourceResult {
    sourceId: string;
    title: string;
    excerpt: string;
    similarity: number;
  } numbering: "1",
)
#set text(
  font: "Linux Libertine",
  size: 11pt,
  lang: "en",
)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

// Title Page
#align(center)[
  #v(2cm)
  #text(size: 20pt, weight: "bold")[Report Title]
  #v(1cm)
  #text(size: 12pt)[Prepared by: Author Name]
  #v(0.5cm)
  #text(size: 12pt)[#datetime.today().display()]
]

#pagebreak()

// Executive Summary
#align(center)[
  #text(size: 14pt, weight: "bold")[Executive Summary]
]
#v(1cm)

This section provides a concise overview of the report's key findings and recommendations.

#pagebreak()

// Main Content
= Introduction

Background and context for the report.

= Findings

Detailed presentation of research findings and data.

= Analysis

In-depth analysis of the findings.

= Recommendations

Actionable recommendations based on the analysis.

= Conclusion

Summary and final thoughts.

// Bibliography
#bibliography("references.bib", title: "References", style: "apa")
