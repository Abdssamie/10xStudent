// Internship Report Template
// This template provides a structured format for internship reports

#set document(title: "Internship Report", author: "Author")
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
  #text(size: 22pt, weight: "bold")[Internship Report]
  #v(1cm)
  #text(size: 14pt)[Student Name]
  #v(0.5cm)
  #text(size: 12pt)[Company/Organization Name]
  #v(0.5cm)
  #text(size: 12pt)[Internship Period: Start Date - End Date]
  #v(0.5cm)
  #text(size: 12pt)[#datetime.today().display()]
]

#pagebreak()

// Introduction
= Introduction

Overview of the internship, company background, and objectives.

= Company Overview

Description of the host organization and its activities.

= Internship Objectives

Goals and learning objectives for the internship period.

= Tasks and Responsibilities

Detailed description of work performed during the internship.

= Skills Acquired

Technical and soft skills developed during the internship.

= Challenges and Solutions

Difficulties encountered and how they were addressed.

= Conclusion

Reflection on the internship experience and key takeaways.

// Bibliography
#bibliography("references.bib", title: "References", style: "apa")
