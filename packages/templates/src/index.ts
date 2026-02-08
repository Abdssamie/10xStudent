import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type TemplateType = "thesis" | "report" | "internship" | "blank";

/**
 * Get a Typst template by name
 * @param templateName - The name of the template to retrieve
 * @returns The template content as a string
 * @throws Error if template not found
 */
export function getTemplate(templateName: TemplateType): string {
  const templatePath = join(__dirname, `${templateName}.typ`);
  try {
    return readFileSync(templatePath, "utf-8");
  } catch (error) {
    throw new Error(`Template "${templateName}" not found at ${templatePath}`);
  }
}

/**
 * Get all available template names
 */
export function getAvailableTemplates(): TemplateType[] {
  return ["thesis", "report", "internship", "blank"];
}
