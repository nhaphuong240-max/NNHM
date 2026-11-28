/** Minimal PDF 1.4. Not a CA-signed document. D08 stays closed. */
export function buildPlainPdf(title: string, lines: string[]): Buffer {
  const body = [title, '', ...lines].map((line) => line.replace(/[()\\]/g, ' ').slice(0, 180));
  const ops: string[] = ['BT', '/F1 11 Tf', '50 780 Td'];
  for (const line of body.slice(0, 60)) {
    ops.push(`(${line}) Tj`, '0 -14 Td');
  }
  ops.push('ET');
  const stream = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  let cursor = chunks[0]!.length;
  objects.forEach((obj, index) => {
    offsets.push(cursor);
    const block = `${index + 1} 0 obj\n${obj}\nendobj\n`;
    const buf = Buffer.from(block);
    chunks.push(buf);
    cursor += buf.length;
  });
  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(Buffer.from(xref), Buffer.from(trailer));
  return Buffer.concat(chunks);
}
