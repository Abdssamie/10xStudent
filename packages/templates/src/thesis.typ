// Thesis Template
// This template provides a structured format for academic theses

#set document(title: "Thesis", author: "Author")
#set page(
  paper: "a4",
  margin: (x: 2.5cm, y: 2.5cm),
  numbering: "1",
)
#set text(
  font: "Linux Libertine",
  size: 12pt,
  lang: "en",
)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

// Title Page
#align(center)[
  #v(2cm)
  #text(size: 24pt, weight: "bold")[Thesis Title]
  #v(1cm)
  #text(size: 14pt)[Author Name]
  #v(0.5cm)
  #text(size: 12pt)[Institution Name]
  #v(0.5cm)
  #text(size: 12pt)[#datetime.today().display()]
]

#pagebreak()

// Abstract
#align(center)[
  #text(size: 14pt, weight: "bold")[Abstract]
]
#v(1cm)

This is the abstract section where you provide a brief summary of your thesis.

#pagebreak()

// Main Content
= Introduction

This is the introduction section of your thesis.

= Literature Review

Review of relevant literature and previous research.

= Methodology

Description of research methods and approaches.

= Results

Presentation of research findings.

= Discussion

Analysis and interpretation of results.

= Conclusion

Summary of findings and future work.

// Bibliography
#bibliography("references.bib", title: "References", style: "apa")
