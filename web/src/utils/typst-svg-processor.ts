/**
 * Processes the raw SVG output from Typst to simulate a multi-page document view.
 * Includes pre-sanitization to prevent strict XML parsing failures.
 */
export function processTypstSvg(rawSvg: string): string {
  const gapSize = 30; // 30px gap between pages

  // 0. Sanitize the string: Escape bare ampersands to satisfy the strict XML parser.
  // This regex matches '&' that are NOT already part of a valid entity (like &amp; or &#123;)
  const sanitizedSvg = rawSvg.replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;");

  // 1. Parse the string into an actual DOM tree
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedSvg, "image/svg+xml");

  // 1.5 Safety check: Did the XML parser still fail?
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    console.error("SVG XML Parsing Error:", parserError.textContent);
    // If it completely fails, returning the raw string will likely break the browser renderer,
    // but we return it to avoid returning undefined.
    return sanitizedSvg;
  }

  // 2. Safely grab all page groups
  const pages = doc.querySelectorAll("g.typst-page");
  const totalPages = pages.length;

  if (totalPages === 0) return sanitizedSvg;

  const svgNS = "http://www.w3.org/2000/svg"; // Required for creating new SVG elements

  // 3. Process each page iteratively
  pages.forEach((page, index) => {
    const transform = page.getAttribute("transform") || "";
    const w = page.getAttribute("data-page-width") || "0";
    const h = page.getAttribute("data-page-height") || "0";

    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    const x = translateMatch ? parseFloat(translateMatch[1] || "0") : 0;
    const y = translateMatch ? parseFloat(translateMatch[2] || "0") : 0;

    const newY = y + index * gapSize;

    const wrapper = doc.createElementNS(svgNS, "g");
    wrapper.setAttribute("class", "typst-page-wrapper");
    wrapper.setAttribute("transform", `translate(${x}, ${newY})`);

    const shadowRect = doc.createElementNS(svgNS, "rect");
    shadowRect.setAttribute("width", w);
    shadowRect.setAttribute("height", h);
    shadowRect.setAttribute("fill", "white");
    shadowRect.setAttribute("class", "shadow-md");
    shadowRect.setAttribute(
      "style",
      "filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)) drop-shadow(0 10px 15px rgba(0,0,0,0.05));",
    );

    page.setAttribute("transform", "translate(0, 0)");

    page.parentNode?.insertBefore(wrapper, page);
    wrapper.appendChild(shadowRect);
    wrapper.appendChild(page);
  });

  // 4. Update the root <svg> dimensions to account for the new gaps
  const svgRoot = doc.documentElement;
  const totalAddedHeight = (totalPages - 1) * gapSize;

  const viewBox = svgRoot.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(" ").map(parseFloat);
    const vx = parts[0] ?? 0;
    const vy = parts[1] ?? 0;
    const vw = parts[2] ?? 0;
    const vh = parts[3] ?? 0;
    svgRoot.setAttribute(
      "viewBox",
      `${vx} ${vy} ${vw} ${vh + totalAddedHeight}`,
    );
  }

  const heightAttr = svgRoot.getAttribute("height");
  if (heightAttr) {
    const currentHeight = parseFloat(heightAttr);
    const unitMatch = heightAttr.match(/[a-z]+$/i);
    const unit = unitMatch ? unitMatch[0] : "";
    svgRoot.setAttribute(
      "height",
      `${currentHeight + totalAddedHeight}${unit}`,
    );
  }

  // 5. Convert the cleanly modified DOM back to a string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}
