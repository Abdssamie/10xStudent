import { type Source } from "@/database/schema/sources";
import { type SourceType } from "@shared/src/source-type";

export function mapSourceTypeToBibTex(type: SourceType | string): string {
  switch (type) {
    case "journal":
      return "article";
    case "book":
      return "book";
    case "conference":
      return "inproceedings";
    case "report":
      return "techreport";
    case "thesis":
      return "phdthesis";
    default:
      return "misc";
  }
}

export function generateBibTex(source: Source): string {
  const type = mapSourceTypeToBibTex(source.sourceType);
  const key = source.citationKey || `source_${source.id}`;
  
  const fields: string[] = [];
  
  if (source.title) {
    fields.push(`  title = {${escapeBibTex(source.title)}}`);
  }
  
  if (source.author) {
    fields.push(`  author = {${escapeBibTex(source.author)}}`);
  }
  
  if (source.publicationDate) {
    const date = new Date(source.publicationDate);
    if (!isNaN(date.getTime())) {
      fields.push(`  year = {${date.getFullYear()}}`);
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      fields.push(`  month = {${monthNames[date.getMonth()]}}`);
    }
  }

  if (source.url) {
    fields.push(`  howpublished = {\\url{${source.url}}}`);
  }
  
  return `@${type}{${key},\n${fields.join(",\n")}\n}`;
}

function escapeBibTex(str: string): string {
  return str.replace(/([&%$#_{}])/g, "\\$1");
}
