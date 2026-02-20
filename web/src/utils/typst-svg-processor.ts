/**
 * Processes the raw SVG output from Typst to simulate a multi-page document view.
 * It injects gaps and shadow rectangles between pages.
 */
export function processTypstSvg(rawSvg: string): string {
  const gapSize = 30; // 30px gap between pages
  
  let processedSvg = rawSvg;
  
  const totalPages = (rawSvg.match(/<g class="typst-page"/g) || []).length;
  
  const regex = /<g class="typst-page" transform="translate\(([^,]+),\s*([^)]+)\)" data-tid="([^"]+)" data-page-width="([^"]+)" data-page-height="([^"]+)">/g;
  
  let match;
  let pageIndex = 0;
  const replacements: { find: string; replace: string }[] = [];
  
  while ((match = regex.exec(rawSvg)) !== null) {
    const fullMatch = match[0];
    const x = match[1] || '0';
    const y = match[2] || '0';
    const tid = match[3] || '';
    const w = match[4] || '0';
    const h = match[5] || '0';
    
    const yOffset = parseFloat(y);
    const totalGap = pageIndex * gapSize;
    const newY = yOffset + totalGap;
    
    const replacement = `<g class="typst-page-wrapper" transform="translate(${x}, ${newY})">
      <rect width="${w}" height="${h}" fill="white" class="shadow-md" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)) drop-shadow(0 10px 15px rgba(0,0,0,0.05));" />
      <g class="typst-page" transform="translate(0, 0)" data-tid="${tid}" data-page-width="${w}" data-page-height="${h}">`;
      
    replacements.push({ find: fullMatch, replace: replacement });
    pageIndex++;
  }
  
  for (const rep of replacements) {
    processedSvg = processedSvg.replace(rep.find, rep.replace);
  }
  
  processedSvg = processedSvg.replace(/(<\/g>\n)(?=<g class="typst-page-wrapper"|<\/svg>)/g, '$1</g>\n');
  
  if (totalPages > 1) {
    const totalAddedHeight = (totalPages - 1) * gapSize;
    
    processedSvg = processedSvg.replace(/viewBox="0 0 ([^ ]+) ([^"]+)"/, (m, vw, vh) => {
      const newHeight = parseFloat(vh) + totalAddedHeight;
      return `viewBox="0 0 ${vw} ${newHeight}"`;
    });
    
    processedSvg = processedSvg.replace(/<svg[^>]+height="([^"]+)"/, (m, h) => {
      const newHeight = parseFloat(h) + totalAddedHeight;
      return m.replace(`height="${h}"`, `height="${newHeight}"`);
    });
  }

  return processedSvg;
}