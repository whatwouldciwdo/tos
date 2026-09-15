import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  BorderStyle,
  WidthType,
  ImageRun,
  VerticalAlign,
  HeightRule,
} from "docx";
import fs from "fs";
import path from "path";

// Enhanced HTML to Paragraphs parser - WITH TABLE SUPPORT
function parseHtmlToParagraphs(html: string | null): Array<Paragraph | Table> {
  if (!html) return [new Paragraph({})];

  const paragraphs: Array<Paragraph | Table> = [];
  
  // Helper: Convert number to Roman numerals
  function toRoman(num: number): string {
    const map: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, numeral] of map) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }
  
  // Helper: Generate list marker based on type
  function getListMarker(type: string, index: number): string {
    switch (type) {
      case 'lower-alpha': return `${String.fromCharCode(96 + index)}. `;
      case 'upper-alpha': return `${String.fromCharCode(64 + index)}. `;
      case 'lower-roman': return `${toRoman(index).toLowerCase()}. `;
      case 'upper-roman': return `${toRoman(index)}. `;
      case 'decimal': return `${index}. `;
      default: return `${index}. `;
    }
  }
  
  // Helper: Clean text from HTML tags
  function cleanHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
      // Repair legacy content where the per-mille symbol was persisted as "???".
      // Keep the pattern narrow so legitimate question marks are not modified.
      .replace(/(\d)\?{3}(?=\s*\((?:satu\s+)?per\s+mil\))/gi, '$1‰')
      .trim();
  }
  
  // Helper: Parse inline formatting. Strikethrough is intentionally ignored
  // so old editor marks cannot make exported content look crossed out.
  function parseInlineText(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let cleanedText = text.replace(/^\u003cp[^\u003e]*\u003e|\u003c\/p\u003e$/gi, '').trim();
    // Split by formatting tags including strikethrough
    const parts = cleanedText.split(/(\u003c\/?(?:strong|b|em|i|u|s|strike|del|p)[^\u003e]*\u003e)/gi);
    
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    
    for (const part of parts) {
      if (!part) continue;
      
      if (/\u003c(strong|b)[^\u003e]*\u003e/i.test(part)) {
        isBold = true;
      } else if (/\u003c\/(strong|b)\u003e/i.test(part)) {
        isBold = false;
      } else if (/\u003c(em|i)[^\u003e]*\u003e/i.test(part)) {
        isItalic = true;
      } else if (/\u003c\/(em|i)\u003e/i.test(part)) {
        isItalic = false;
      } else if (/\u003cu[^\u003e]*\u003e/i.test(part)) {
        isUnderline = true;
      } else if (/\u003c\/u\u003e/i.test(part)) {
        isUnderline = false;
      } else if (/\u003c(s|strike|del)[^\u003e]*\u003e/i.test(part)) {
        continue;
      } else if (/\u003c\/(s|strike|del)\u003e/i.test(part)) {
        continue;
      } else if (/\u003c\/?p[^\u003e]*\u003e/i.test(part)) {
        continue;
      } else if (!/^\u003c/.test(part)) {
        const cleanText = cleanHtml(part);
        
        if (cleanText) {
          runs.push(new TextRun({
            text: cleanText,
            font: "Arial",
            size: 20,
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? {} : undefined,
          }));
        }
      }
    }
    
    return runs;
  }
  
  // Helper: Extract list style type from ol tag
  function extractListStyleType(olTag: string): string {
    const dataStyleMatch = olTag.match(/data-list-style=["']([^"']+)["']/i);
    if (dataStyleMatch) {
      return dataStyleMatch[1];
    }
    
    const styleMatch = olTag.match(/style=["'][^"']*list-style-type:\s*([^;"']+)[^"']*["']/i);
    if (styleMatch) {
      return styleMatch[1].trim();
    }
    
    const classMatch = olTag.match(/class=["'][^"']*list-style-([^"'\s]+)[^"']*["']/i);
    if (classMatch) {
      return classMatch[1];
    }
    
    return 'decimal';
  }
  
  // Process table element with gray header background
  function processTable(tableHtml: string): Table {
    console.log('   📊 Processing table');
    
    const rows: TableRow[] = [];
    
    // Extract all <tr> elements
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let rowIndex = 0;
    
    while ((trMatch = trRegex.exec(tableHtml)) !== null) {
      const trContent = trMatch[1];
      const cells: TableCell[] = [];
      
      // Check if this row contains <th> elements (header row)
      const hasHeaders = /<th[^>]*>/i.test(trContent);
      
      // Extract all <td> and <th> elements
      const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(trContent)) !== null) {
        const isHeader = cellMatch[1].toLowerCase() === 'th';
        const cellContent = cellMatch[2];
        const cellText = cleanHtml(cellContent);
        
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText || '',
                    font: "Arial",
                    size: 20,
                    bold: isHeader,
                  }),
                ],
                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
            // Add gray background for header cells
            shading: isHeader ? {
              fill: "D3D3D3", // Light gray color (same as Tiptap)
              color: "auto",
            } : undefined,
          })
        );
      }
      
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
      
      rowIndex++;
    }
    
    console.log(`   ✅ Table with ${rows.length} rows`);
    
    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    });
  }
  
  // Process image element with base64 support
  function processImage(imgTag: string): Paragraph {
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
    const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
    
    const alt = altMatch ? altMatch[1] : 'Image';
    const src = srcMatch ? srcMatch[1] : '';
    
    console.log(`   🖼️ Image found: ${alt}`);
    console.log(`      Source type: ${src.startsWith('data:') ? 'base64 data URL' : 'external URL'}`);
    
    // Handle base64 data URLs (from Tiptap paste)
    if (src.startsWith('data:image/')) {
      try {
        // Extract the base64 data
        const base64Match = src.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (base64Match) {
          const imageType = base64Match[1]; // png, jpeg, gif, etc.
          const base64Data = base64Match[2];
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Calculate dimensions (max 600px width for document)
          let width = widthMatch ? parseInt(widthMatch[1]) : 600;
          let height = heightMatch ? parseInt(heightMatch[1]) : 400;
          
          // Scale down if too large
          if (width > 600) {
            const ratio = 600 / width;
            width = 600;
            height = Math.floor(height * ratio);
          }
          
          console.log(`   ✅ Base64 image loaded: ${width}x${height}px, type: ${imageType}`);
          
          // Map image type for docx
          let docxType: "jpg" | "png" | "gif" | "bmp" = "png";
          if (imageType === "jpeg" || imageType === "jpg") docxType = "jpg";
          else if (imageType === "png") docxType = "png";
          else if (imageType === "gif") docxType = "gif";
          else if (imageType === "bmp") docxType = "bmp";
          
          return new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: width,
                  height: height,
                },
                type: docxType,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          });
        }
      } catch (error) {
        console.error(`   ❌ Error processing base64 image:`, error);
      }
    }
    
    // Fallback for non-base64 images or errors
    console.log(`   ⚠️ Image cannot be embedded (only base64 data URLs are supported)`);
    return new Paragraph({
      children: [
        new TextRun({ 
          text: `[📷 Image: ${alt}]`,
          italics: true,
          color: "666666",
          font: "Arial",
          size: 20,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    });
  }
  
  // Track processed ranges to avoid duplicates
  const processedRanges: Array<{ start: number; end: number }> = [];
  
  function isOverlapping(start: number, end: number): boolean {
    return processedRanges.some(range => 
      (start >= range.start && start < range.end) || 
      (end > range.start && end <= range.end) ||
      (start <= range.start && end >= range.end)
    );
  }
  
  // Find all top-level elements and their positions
  const elements: Array<{ 
    type: string; 
    index: number; 
    length: number; 
    match: RegExpExecArray | null; 
    content?: string;
    caption?: string;
  }> = [];
  
  // Find all <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    elements.push({ 
      type: 'p', 
      index: pMatch.index, 
      length: pMatch[0].length,
      match: pMatch 
    });
  }
  
  // Find all <ol> tags
  const olRegex = /<ol([^>]*)>([\s\S]*?)<\/ol>/gi;
  let olMatch;
  while ((olMatch = olRegex.exec(html)) !== null) {
    elements.push({ 
      type: 'ol', 
      index: olMatch.index, 
      length: olMatch[0].length,
      match: olMatch 
    });
  }
  
  // Find all <ul> tags
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  let ulMatch;
  while ((ulMatch = ulRegex.exec(html)) !== null) {
    elements.push({ 
      type: 'ul', 
      index: ulMatch.index, 
      length: ulMatch[0].length,
      match: ulMatch 
    });
  }
  
  // Find all <figure> tags (with captions)
  const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/gi;
  let figureMatch;
  while ((figureMatch = figureRegex.exec(html)) !== null) {
    const figureContent = figureMatch[1];
    // Extract img and figcaption from figure
    const imgInFigure = figureContent.match(/<img[^>]*>/i);
    const figcaption = figureContent.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    
    if (imgInFigure) {
      elements.push({ 
        type: 'figure', 
        index: figureMatch.index, 
        length: figureMatch[0].length,
        match: null,
        content: imgInFigure[0],
        caption: figcaption ? figcaption[1] : undefined
      });
    }
  }
  
  // Find standalone <img> tags (without figure wrapper)
  const imgRegex = /<img[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    // Check if this img is inside a figure tag (already processed)
    const isInFigure = elements.some(el => 
      el.type === 'figure' && 
      imgMatch.index >= el.index && 
      imgMatch.index < el.index + el.length
    );
    
    if (!isInFigure) {
      elements.push({ 
        type: 'img', 
        index: imgMatch.index, 
        length: imgMatch[0].length,
        match: null,
        content: imgMatch[0]
      });
    }
  }
  
  // Find all <table> tags
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    elements.push({ 
      type: 'table', 
      index: tableMatch.index, 
      length: tableMatch[0].length,
      match: null,
      content: tableMatch[0]
    });
  }
  
  // Sort by position in HTML
  elements.sort((a, b) => a.index - b.index);
  
  console.log(`📋 Found ${elements.length} elements`);
  
  // Process each element in order
  elements.forEach((element, idx) => {
    
    if (element.type === 'ol') {
      // Skip if overlapping (for nested lists)
      if (isOverlapping(element.index, element.index + element.length)) {
        console.log(`   ⏭️ Skipping overlapping ${element.type} at position ${element.index}`);
        return;
      }
      
      const olTag = element.match![1] || '';
      const olContent = element.match![2];
      const listStyleType = extractListStyleType('<ol' + olTag + '>');
      
      console.log(`${idx + 1}. 🔢 Ordered list (${listStyleType})`);
      
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items: string[] = [];
      let liMatch;
      
      while ((liMatch = liRegex.exec(olContent)) !== null) {
        items.push(liMatch[1]);
      }
      
      items.forEach((liContent, itemIdx) => {
        const index = itemIdx + 1;
        const marker = getListMarker(listStyleType, index);
        const runs = parseInlineText(liContent);
        
        if (runs.length > 0) {
          runs.unshift(new TextRun({
            text: marker,
            font: "Arial",
            size: 20,
          }));
          
          paragraphs.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 100 },
            indent: { left: 720, hanging: 360 },
          }));
          
          const preview = cleanHtml(liContent).substring(0, 30);
          console.log(`   ${marker}${preview}`);
        }
      });
      
      processedRanges.push({
        start: element.index,
        end: element.index + element.length
      });
      
    } else if (element.type === 'ul') {
      // Skip if overlapping (for nested lists)
      if (isOverlapping(element.index, element.index + element.length)) {
        console.log(`   ⏭️ Skipping overlapping ${element.type} at position ${element.index}`);
        return;
      }
      
      const ulContent = element.match![1];
      
      console.log(`${idx + 1}. 🔘 Unordered list`);
      
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items: string[] = [];
      let liMatch;
      
      while ((liMatch = liRegex.exec(ulContent)) !== null) {
        items.push(liMatch[1]);
      }
      
      items.forEach(liContent => {
        const runs = parseInlineText(liContent);
        
        if (runs.length > 0) {
          runs.unshift(new TextRun({
            // Use an ASCII marker; some DOCX/PDF viewers render the bullet
            // glyph as "???" when the selected font lacks that glyph.
            text: '- ',
            font: "Arial",
            size: 20,
          }));
          
          paragraphs.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 100 },
            indent: { left: 720, hanging: 360 },
          }));
          
          const preview = cleanHtml(liContent).substring(0, 30);
          console.log(`   • ${preview}`);
        }
      });
      
      processedRanges.push({
        start: element.index,
        end: element.index + element.length
      });
      
    } else if (element.type === 'img') {
      // Standalone images (without caption) should NEVER be skipped
      console.log(`${idx + 1}. 🖼️ Image element`);
      
      const imageParagraph = processImage(element.content!);
      paragraphs.push(imageParagraph);
      
      // Don't add to processedRanges - images are standalone
      
    } else if (element.type === 'figure') {
      // Figure with caption
      console.log(`${idx + 1}. 🖼️ Figure with caption`);
      
      // Process image
      const imageParagraph = processImage(element.content!);
      paragraphs.push(imageParagraph);
      
      // Process caption if exists
      if (element.caption) {
        const captionText = cleanHtml(element.caption);
        if (captionText) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: captionText,
                font: "Arial",
                size: 18, // Slightly smaller than body text
                italics: true,
                color: "666666",
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }));
          console.log(`   📝 Caption: ${captionText}`);
        }
      }
      
      // Don't add to processedRanges - figures are standalone
      
    } else if (element.type === 'table') {
      // Tables should NEVER be skipped
      console.log(`${idx + 1}. 📊 Table element`);
      
      const table = processTable(element.content!);
      paragraphs.push(table);
      
      processedRanges.push({
        start: element.index,
        end: element.index + element.length
      });
      
    } else if (element.type === 'p') {
      // Skip if overlapping (for paragraphs inside lists)
      if (isOverlapping(element.index, element.index + element.length)) {
        console.log(`   ⏭️ Skipping overlapping ${element.type} at position ${element.index}`);
        return;
      }
      
      const pContent = element.match![1];
      const cleaned = cleanHtml(pContent);
      
      // Handle empty paragraphs as line breaks
      if (!cleaned || cleaned === '' || pContent.trim() === '<br>' || pContent.trim() === '<br/>') {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '', font: "Arial", size: 20 })],
          spacing: { after: 200 },
        }));
        
        console.log(`${idx + 1}. 📝 [empty line]`);
        
        processedRanges.push({
          start: element.index,
          end: element.index + element.length
        });
        return;
      }
      
      const runs = parseInlineText(pContent);
      
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, after: 200 },
        }));
        
        const preview = cleaned.substring(0, 30);
        console.log(`${idx + 1}. 📝 ${preview}`);
        
        processedRanges.push({
          start: element.index,
          end: element.index + element.length
        });
      }
    }
  });
  
  console.log(`✅ Total exported: ${paragraphs.length} elements\n`);
  
  return paragraphs.length > 0 ? paragraphs : [new Paragraph({})];
}

// Helper function to load image with error handling
function loadCoverImage(coverImagePath: string | null): {
  buffer: Buffer | null;
  type: "jpg" | "png" | "gif" | "bmp";
  error?: string;
} {
  if (!coverImagePath) {
    return { buffer: null, type: "jpg" };
  }

  try {
    // ✅ FIX: Normalize path - remove leading slashes
    const normalizedPath = coverImagePath.replace(/^\/+/, '');
    
    // Build full path from project root
    const fullImagePath = path.join(process.cwd(), "public", normalizedPath);
    
    console.log("🖼️  Attempting to load cover image from:", fullImagePath);
    
    // Check if file exists
    if (!fs.existsSync(fullImagePath)) {
      console.error("❌ Cover image not found at:", fullImagePath);
      return { 
        buffer: null, 
        type: "jpg", 
        error: "File not found" 
      };
    }
    
    // Read image file
    const imageBuffer = fs.readFileSync(fullImagePath);
    
    // Detect image type from extension
    const ext = path.extname(normalizedPath).toLowerCase();
    let imageType: "jpg" | "png" | "gif" | "bmp" = "jpg";
    
    if (ext === ".png") imageType = "png";
    else if (ext === ".gif") imageType = "gif";
    else if (ext === ".bmp") imageType = "bmp";
    else if (ext === ".jpg" || ext === ".jpeg") imageType = "jpg";
    
    console.log("✅ Cover image loaded successfully!");
    console.log("   - Type:", imageType);
    console.log("   - Size:", imageBuffer.length, "bytes");
    
    return { buffer: imageBuffer, type: imageType };
  } catch (error) {
    console.error("❌ Error loading cover image:", error);
    return { 
      buffer: null, 
      type: "jpg", 
      error: String(error) 
    };
  }
}

// Generate Work Stages Gantt Table
function generateWorkStagesTable(workStagesData: any): Table {
  if (!workStagesData || !workStagesData.years || !workStagesData.rows) {
    return new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph("No data available")],
            }),
          ],
        }),
      ],
    });
  }

  const years = workStagesData.years;
  const rows = workStagesData.rows;

  // 1. Header Row 1: No, Deskripsi, Years
  const headerRow1Cells = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, font: "Arial", size: 16, color: "000000" })], alignment: AlignmentType.CENTER })],
      rowSpan: 2,
      verticalAlign: VerticalAlign.CENTER,
      width: { size: 4, type: WidthType.PERCENTAGE },
      shading: { fill: "22D3EE", color: "auto" },
    }),
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: "Deskripsi", bold: true, font: "Arial", size: 16, color: "000000" })], alignment: AlignmentType.CENTER })],
      rowSpan: 2,
      verticalAlign: VerticalAlign.CENTER,
      width: { size: 20, type: WidthType.PERCENTAGE },
      shading: { fill: "22D3EE", color: "auto" },
    }),
  ];

  // Calculate total months to distribute remaining width
  const totalMonths = years.reduce((acc: number, year: any) => acc + year.months.length, 0);
  const remainingWidth = 76;
  const monthWidth = totalMonths > 0 ? remainingWidth / totalMonths : 0;

  // Add Year headers
  years.forEach((year: any) => {
    headerRow1Cells.push(
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: year.label, bold: true, font: "Arial", size: 16, color: "000000" })], alignment: AlignmentType.CENTER })],
        columnSpan: year.months.length,
        shading: { fill: "22D3EE", color: "auto" },
      })
    );
  });

  // 2. Header Row 2: Months
  const headerRow2Cells: TableCell[] = [];
  years.forEach((year: any) => {
    year.months.forEach((month: string) => {
      headerRow2Cells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: month, size: 12, font: "Arial", color: "000000" })], alignment: AlignmentType.CENTER })],
          width: { size: monthWidth, type: WidthType.PERCENTAGE },
          shading: { fill: "22D3EE", color: "auto" },
        })
      );
    });
  });

  // 3. Data Rows
  const dataRows = rows.map((row: any) => {
    const cells = [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: row.no.toString(), size: 16, font: "Arial", color: "000000" })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: row.description, size: 16, font: "Arial", color: "000000" })] })],
      }),
    ];

    // Add schedule cells
    years.forEach((year: any) => {
      year.months.forEach((_: any, monthIdx: number) => {
        const isActive = row.schedule[year.id]?.[monthIdx];
        cells.push(
          new TableCell({
            children: [new Paragraph("")],
            shading: isActive ? { fill: "00FF00", color: "auto" } : undefined,
          })
        );
      });
    });

    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerRow1Cells }),
      new TableRow({ children: headerRow2Cells }),
      ...dataRows,
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });
}

// === TAB 6 LAMPIRAN TABLE GENERATORS ===

// ============================================================
// CUSTOM BATTERY TABLE GENERATOR - Following exact spec layout
// ============================================================

// Column widths for Battery table (in percentage)
const BATTERY_COL_WIDTHS = {
  no: 3,           // ~48px
  spec: 52,        // ~820px
  ptx: 8,          // ~120px
  pty: 8,          // ~120px
  ptz: 8,          // ~120px
  keterangan: 16   // ~260px
};

// Font sizes for Battery export
const BATTERY_FONT = {
  header: 14,      // 7pt
  content: 12,     // 6pt
  nested: 10       // 5pt for nested content
};

// Cell margin for Battery
const BATTERY_MARGIN = { top: 30, bottom: 30, left: 40, right: 40 };
const BATTERY_MARGIN_SMALL = { top: 20, bottom: 20, left: 30, right: 30 };

// Create nested grid table inside a cell
function createNestedGrid(columns: string[]): Table {
  const cells = columns.map((text, idx) => 
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: text,
          font: "Arial",
          size: BATTERY_FONT.nested,
          color: "000000"
        })]
      })],
      margins: BATTERY_MARGIN_SMALL,
      borders: {
        left: idx > 0 ? { style: BorderStyle.SINGLE, size: 1, color: "888888" } : { style: BorderStyle.NIL },
        right: { style: BorderStyle.NIL },
        top: { style: BorderStyle.NIL },
        bottom: { style: BorderStyle.NIL }
      }
    })
  );
  
  return new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      left: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL },
      insideHorizontal: { style: BorderStyle.NIL },
      insideVertical: { style: BorderStyle.NIL }
    }
  });
}

// Create a regular data row for Battery table
function createBatteryRow(no: string, specContent: Table | Paragraph | string, dashed: boolean = false): TableRow {
  const borderStyle = dashed ? BorderStyle.DASHED : BorderStyle.SINGLE;
  
  // Handle spec content - can be Table, Paragraph, or string
  let specChildren: (Table | Paragraph)[];
  if (typeof specContent === 'string') {
    specChildren = [new Paragraph({
      children: [new TextRun({
        text: specContent,
        font: "Arial",
        size: BATTERY_FONT.content,
        color: "000000"
      })]
    })];
  } else if (specContent instanceof Table) {
    specChildren = [specContent];
  } else {
    specChildren = [specContent];
  }
  
  return new TableRow({
    children: [
      // NO column
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: no, font: "Arial", size: BATTERY_FONT.content, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.no, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN
      }),
      // SPESIFICATION REQUIREMENTS column
      new TableCell({
        children: specChildren,
        width: { size: BATTERY_COL_WIDTHS.spec, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN
      }),
      // PT. X column
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: BATTERY_FONT.content })] })],
        width: { size: BATTERY_COL_WIDTHS.ptx, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        borders: {
          top: { style: borderStyle, size: 1, color: "000000" }
        }
      }),
      // PT. Y column
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: BATTERY_FONT.content })] })],
        width: { size: BATTERY_COL_WIDTHS.pty, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        borders: {
          top: { style: borderStyle, size: 1, color: "000000" }
        }
      }),
      // PT. Z column
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: BATTERY_FONT.content })] })],
        width: { size: BATTERY_COL_WIDTHS.ptz, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        borders: {
          top: { style: borderStyle, size: 1, color: "000000" }
        }
      }),
      // KETERANGAN column
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: BATTERY_FONT.content })] })],
        width: { size: BATTERY_COL_WIDTHS.keterangan, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        borders: {
          top: { style: borderStyle, size: 1, color: "000000" }
        }
      })
    ]
  });
}

// Create section header row (text only in SPEC column)
function createBatterySectionRow(no: string, sectionTitle: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: no, font: "Arial", size: BATTERY_FONT.content, bold: true, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.no, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        shading: { fill: "F3F4F6" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: sectionTitle, font: "Arial", size: BATTERY_FONT.content, bold: true, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.spec, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        shading: { fill: "F3F4F6" }
      }),
      new TableCell({
        children: [new Paragraph({})],
        width: { size: BATTERY_COL_WIDTHS.ptx, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" }
      }),
      new TableCell({
        children: [new Paragraph({})],
        width: { size: BATTERY_COL_WIDTHS.pty, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" }
      }),
      new TableCell({
        children: [new Paragraph({})],
        width: { size: BATTERY_COL_WIDTHS.ptz, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" }
      }),
      new TableCell({
        children: [new Paragraph({})],
        width: { size: BATTERY_COL_WIDTHS.keterangan, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" }
      })
    ]
  });
}

// Create the "Tipe Sel" nested table (8 rows, 3 columns)
function createTipeSelTable(): Table {
  const rows: TableRow[] = [];
  
  // Row 1: OPzS (spans all 3 columns)
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "OPzS", font: "Arial", size: BATTERY_FONT.nested, bold: true, color: "000000" })]
        })],
        columnSpan: 3,
        margins: BATTERY_MARGIN_SMALL
      })
    ]
  }));
  
  // Rows 2-8: 3-column data
  const data = [
    ["Plate", "Positif: TUBULAR", "Negatif: GRID"],
    ["Lead Alloying", "Low Antimony", "0,5 ~ 1 %"],
    ["Container", "High Quality Transparent Electrolyte Proof Material (AcrylNitrile-Styrene)", "Black Color container is NOT APPROVED"],
    ["Number of Poles Terminal", "Positif: Min. 3 pcs", "Negatif: Min. 3 pcs"],
    ["Electrolyte Spesific Grafity (SG)", "1.22 atau 1.24", "At 25 °C"],
    ["Full Charge Electrolyte Specific Gravity (SG)", "1,27", "At 25 °C"],
    ["Design Life Time", "Min 20 years (Certified Letter by Manufacture)", "At 20 °C"]
  ];
  
  data.forEach(row => {
    rows.push(new TableRow({
      children: row.map((text, idx) => 
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text, font: "Arial", size: BATTERY_FONT.nested, color: "000000" })]
          })],
          margins: BATTERY_MARGIN_SMALL,
          borders: {
            left: idx > 0 ? { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } : undefined
          }
        })
      )
    }));
  });
  
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "888888" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
    }
  });
}

// Create complete Battery spec cell with "Tipe Sel" label and nested table
function createTipeSelCell(): TableCell {
  // This creates a special cell with "Tipe Sel" on left and nested table on right
  const innerTable = new Table({
    rows: [new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ 
              text: "Tipe Sel", 
              font: "Arial", 
              size: BATTERY_FONT.content, 
              bold: true, 
              color: "000000" 
            })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          margins: BATTERY_MARGIN_SMALL
        }),
        new TableCell({
          children: [createTipeSelTable()],
          width: { size: 85, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        })
      ]
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      left: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL }
    }
  });
  
  return new TableCell({
    children: [innerTable],
    width: { size: BATTERY_COL_WIDTHS.spec, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    rowSpan: 8 // Spans rows 9-16
  });
}

// Main Battery table generator
function generateBatteryTable(): Table {
  const rows: TableRow[] = [];
  
  // ============ HEADER ROWS ============
  // Row 1 of header: NO | SPESIFICATION REQUIREMENTS | NAMA VENDOR (colspan 3) | KETERANGAN
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "NO", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.no, type: WidthType.PERCENTAGE },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "SPESIFICATION REQUIREMENTS", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.spec, type: WidthType.PERCENTAGE },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "NAMA VENDOR", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        columnSpan: 3,
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "KETERANGAN", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.keterangan, type: WidthType.PERCENTAGE },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      })
    ]
  }));
  
  // Row 2 of header: PT. X | PT. Y | PT. Z
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. X", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.ptx, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. Y", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.pty, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. Z", bold: true, font: "Arial", size: BATTERY_FONT.header, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.ptz, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN,
        shading: { fill: "CFE2F3" }
      })
    ]
  }));
  
  // ============ GENERAL SECTION (rows 1-4) ============
  rows.push(createBatterySectionRow("1", "GENERAL"));
  rows.push(createBatteryRow("2", createNestedGrid(["Kesuaian Temperature", "Temperatur (°C): 33", "Min: 28", "Max: 35"]), true));
  rows.push(createBatteryRow("3", createNestedGrid(["Kesuaian Zona Gempa", "Zona : 3"]), true));
  rows.push(createBatteryRow("4", "", true));
  
  // ============ APPROVAL STANDARDS SECTION (rows 5-7) ============
  rows.push(createBatterySectionRow("5", "APPROVAL STANDARDS"));
  rows.push(createBatteryRow("6", createNestedGrid(["Standard", "ANSI / IEEE / IEC / JIS / DIN/VDE"]), true));
  rows.push(createBatteryRow("7", "", true));
  
  // ============ STATIONARY BATTERY SPECIFICATION (rows 8-22) ============
  rows.push(createBatterySectionRow("8", "STATIONARY BATTERY SPECIFICATION"));
  
  // Row 9 - Special row with Tipe Sel (rowSpan=8)
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "9", font: "Arial", size: BATTERY_FONT.content, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: BATTERY_COL_WIDTHS.no, type: WidthType.PERCENTAGE },
        margins: BATTERY_MARGIN
      }),
      createTipeSelCell(), // This has rowSpan=8
      new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
      new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
      new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
      new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN })
    ]
  }));
  
  // Rows 10-16 (only NO and vendor columns, SPEC column is merged)
  for (let i = 10; i <= 16; i++) {
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: i.toString(), font: "Arial", size: BATTERY_FONT.content, color: "000000" })],
            alignment: AlignmentType.CENTER
          })],
          margins: BATTERY_MARGIN
        }),
        new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
        new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
        new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN }),
        new TableCell({ children: [new Paragraph({})], margins: BATTERY_MARGIN })
      ]
    }));
  }
  
  // Rows 17-22
  rows.push(createBatteryRow("17", createNestedGrid(["Minimum Kapasitas (Ampere Hours):", "2000 Ah (C10)"]), true));
  rows.push(createBatteryRow("18", createNestedGrid(["Tegangan Nominal/Cell : 2 Volt", "Tegangan Float Cell : 2,2 Volt", "Tegangan Equalize (Boost) Cell : 2,25 V"]), true));
  rows.push(createBatteryRow("19", createNestedGrid(["End Voltage per Cell (Battery Design)", "Minimum 1,80 Volts", "End Voltage yang menyatakan battery sudah rusak."]), true));
  rows.push(createBatteryRow("20", createNestedGrid(["End Voltage per Cell at Commissioning/ Acceptance Test", "Minimum 1,85 Volts", "Metode Test C10 (200 A 10 jam). Test dilakukan Vendor termasuk alat dummy load, charging, dll disediakan oleh Vendor."]), true));
  rows.push(createBatteryRow("21", createNestedGrid(["Metode Pengiriman:", "Kering", "Dry Pre-Charged for Un-Limited Time Storage"]), true));
  rows.push(createBatteryRow("22", createNestedGrid(["Jumlah Discharge Cycles", "Minimal 1000 Cycle (Certified Letter by Manufacture)"]), true));
  
  // ============ LOAD CHARACTERISTIC SECTION (rows 23-25) ============
  rows.push(createBatteryRow("23", "", true));
  rows.push(createBatterySectionRow("24", "KESESUAIAN DENGAN LOAD CHARACTERISTIC (End Voltage 1,80 VPC Back-Up Time 10 hours)"));
  
  // Row 25: Chart placeholder (will add image later)
  rows.push(createBatteryRow("25", new Paragraph({
    children: [new TextRun({ 
      text: "Baterai harus dapat memenuhi load karakteristik berikut:\n[Lihat diagram Load Characteristic A-B-C-D]", 
      font: "Arial", 
      size: BATTERY_FONT.content, 
      color: "000000" 
    })]
  }), true));
  
  // ============ BATTERY RACK SPECIFICATION (rows 26-29) ============
  rows.push(createBatteryRow("26", "", true));
  rows.push(createBatterySectionRow("27", "BATTERY RACK SPECIFICATION"));
  rows.push(createBatteryRow("28", createNestedGrid(["MATERIAL", "CARBON STEEL DICAT DENGAN ANTI ACID COATING DAN DI BAWAH BATTERY DILENGKAPI DENGAN INSULATORS, CROSS BEAMS DAN WOOD STRIPS", "ANTI SEISMIC BATTERY RACK (TAHAN GEMPA)"]), true));
  rows.push(createBatteryRow("29", "", true));
  
  // ============ ACCESSORIES SECTION (rows 30-35) ============
  rows.push(createBatterySectionRow("30", "ACCESSORIES"));
  rows.push(createBatteryRow("31", createNestedGrid(["Hydrometer Portabel", "Diperlukan 2 buah"]), true));
  rows.push(createBatteryRow("32", createNestedGrid(["Hydrometer Vent-Mounted", "Diperlukan 2 buah"]), true));
  rows.push(createBatteryRow("33", createNestedGrid(["Thermometer Vent-Mounted", "Diperlukan sebanyak jumlah battery yang diminta (±110 buah)"]), true));
  rows.push(createBatteryRow("34", createNestedGrid(["Pengangkat Sel Portable (Lifting Truck)", "Diperlukan 1 set"]), true));
  rows.push(createBatteryRow("35", createNestedGrid(["Portable Charger smooth selector 2 - 12 Volt continous current 200 Ampere", "Diperlukan 1 set"]), true));
  
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
    }
  });
}

// Helper to generate Technical Particular & Guarantee (TPG) Table
function generateTpgTable(items: any[]): Table {
  const cellMargin = { top: 40, bottom: 40, left: 30, right: 30 }; // Reduced margins for page fitting
  const headerSize = 14; // 7pt - optimized for page fitting
  const contentSize = 12; // 6pt - optimized for page fitting

  // Detect column structure from first data item (skip headers)
  const firstDataItem = items.find(item => {
    const keys = Object.keys(item).filter(k => k !== 'id');
    return keys.length > 1; // Has more than just description
  });
  
  // Detect Battery format (has specificationRequirements, vendorPTX, vendorPTY, vendorPTZ, keterangan)
  const isBatteryFormat = firstDataItem && 'specificationRequirements' in firstDataItem && 'vendorPTX' in firstDataItem;
  
  // Detect multi-column Battery format (has spec1, spec2, spec3, spec4, vendorPTX)
  const isMultiColumnBattery = firstDataItem && 'spec1' in firstDataItem && 'vendorPTX' in firstDataItem;
  
  // Detect AVR format (has unit, required, proposedGuaranteed)
  const isAvrFormat = firstDataItem && 'unit' in firstDataItem && 'required' in firstDataItem && 'proposedGuaranteed' in firstDataItem;
  
  // Detect Arrester format (has description, specified, proposedGuarantee)
  const isArresterFormat = firstDataItem && 'description' in firstDataItem && 'specified' in firstDataItem;
  
  // Define columns based on format
  let columns: { key: string; label: string; width: number }[];
  
  if (isBatteryFormat || isMultiColumnBattery) {
    columns = [
      { key: 'specificationRequirements', label: 'SPESIFICATION REQUIREMENTS', width: 30 },
      { key: 'vendorPTX', label: 'PT. X', width: 15 },
      { key: 'vendorPTY', label: 'PT. Y', width: 15 },
      { key: 'vendorPTZ', label: 'PT. Z', width: 15 },
      { key: 'keterangan', label: 'KETERANGAN', width: 20 }
    ];
  } else if (isAvrFormat) {
    columns = [
      { key: 'description', label: 'DESCRIPTION', width: 30 },
      { key: 'unit', label: 'UNIT', width: 8 },
      { key: 'required', label: 'REQUIRED', width: 17 },
      { key: 'proposedGuaranteed', label: 'PROPOSED AND GUARANTEED', width: 25 },
      { key: 'remarks', label: 'REMARKS', width: 15 }
    ];
  } else if (isArresterFormat) {
    columns = [
      { key: 'description', label: 'DESCRIPTION', width: 40 },
      { key: 'specified', label: 'SPECIFIED', width: 30 },
      { key: 'proposedGuarantee', label: 'PROPOSED & GUARANTEE', width: 25 }
    ];
  } else {
    columns = [
      { key: 'specification', label: 'Spesifikasi', width: 35 },
      { key: 'ownerRequest', label: 'Owner Request', width: 30 },
      { key: 'vendorProposed', label: 'Vendor Proposed & Guarantee', width: 30 }
    ];
  }

  // Header row(s) - Battery format needs two rows with merged "NAMA VENDOR" header
  let headerRows: TableRow[];
  
  if (isBatteryFormat || isMultiColumnBattery) {
    // Row 1: NO (rowspan 2) | SPESIFICATION REQUIREMENTS (rowspan 2) | NAMA VENDOR (colspan 3) | KETERANGAN (rowspan 2)
    const headerRow1Cells = [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "NO", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 5, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: "F3F4F6", color: "auto" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "SPESIFICATION REQUIREMENTS", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 30, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: "F3F4F6", color: "auto" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "NAMA VENDOR", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        columnSpan: 3,
        margins: cellMargin,
        shading: { fill: "F3F4F6", color: "auto" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "KETERANGAN", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: "F3F4F6", color: "auto" }
      })
    ];

    // Row 2: PT. X | PT. Y | PT. Z
    const headerRow2Cells = [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. X", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        shading: { fill: "F3F4F6", color: "auto" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. Y", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        shading: { fill: "F3F4F6", color: "auto" }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: "PT. Z", bold: true, font: "Arial", size: headerSize, color: "000000" })],
          alignment: AlignmentType.CENTER
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        margins: cellMargin,
        shading: { fill: "F3F4F6", color: "auto" }
      })
    ];

    headerRows = [
      new TableRow({ children: headerRow1Cells }),
      new TableRow({ children: headerRow2Cells })
    ];
  } else {
    // Standard single-row header for other formats
    const headerCells = [
      new TableCell({ 
        children: [new Paragraph({ 
          children: [new TextRun({ text: "No.", bold: true, font: "Arial", size: headerSize, color: "000000" })], 
          alignment: AlignmentType.CENTER 
        })], 
        width: { size: 5, type: WidthType.PERCENTAGE }, 
        margins: cellMargin, 
        shading: { fill: "F3F4F6", color: "auto" } // Light gray header
      }),
      ...columns.map(col => 
        new TableCell({ 
          children: [new Paragraph({ 
            children: [new TextRun({ text: col.label, bold: true, font: "Arial", size: headerSize, color: "000000" })], 
            alignment: AlignmentType.CENTER 
          })], 
          width: { size: col.width, type: WidthType.PERCENTAGE }, 
          margins: cellMargin, 
          shading: { fill: "F3F4F6", color: "auto" } // Light gray header
        })
      )
    ];
    
    headerRows = [new TableRow({ children: headerCells })];
  }

  // Map section names to colors (order matters - check more specific first)
  const sectionColors: { [key: string]: string } = {
    'SPEC ARRESTER': 'FFFF00',        // Yellow
    'SPEC COUNTER LA': 'FFA500',      // Orange
    'INSPECTION & TESTING REQUIREMENT AT FACTORY': 'FFDAB9', // Peach
    'INSPECTION & TESTING REQUIREMENT AT SITE (WITNESS)': 'D4F1D4',    // Light green
    'INSPECTION & TESTING REQUIREMENT AT SITE': 'D4F1D4',    // Light green (fallback)
    'DOCUMENTS REQUIREMENT': 'ADD8E6'  // Light blue
  };

  const rows = [
    ...headerRows,
    ...items.map((item, index) => {
      // === ID-based header detection ===
      // New format: Header IDs have no hyphen-letter pattern (e.g., "1", "1.1", "1.10")
      // Data row IDs have hyphen-letter pattern (e.g., "1-a", "1.1-a", "1.10-a")
      // Legacy format: Headers end with "-0" (e.g., "1-0", "1.1-0")
      const itemId = item.id || "";
      const hasHyphenLetter = /-[a-z]/.test(itemId);
      const isLegacyHeader = itemId.endsWith('-0');
      const isNewFormatHeader = itemId && !hasHyphenLetter && !isLegacyHeader && /^[\d.]+$/.test(itemId);
      
      // Content-based fallback for templates without proper IDs
      const isHeaderByContent = item.description && 
        !item.specified && !item.proposedGuarantee &&  // Arrester format
        (!item.unit || item.unit === '-') && !item.required && !item.proposedGuaranteed; // AVR format
      
      const isHeaderRow = isLegacyHeader || isNewFormatHeader || isHeaderByContent;
      
      // Get description text for section detection (handle description, specificationRequirements, and spec1 for Battery)
      const descriptionText = (item.description || item.specificationRequirements || item.spec1 || '').toString();
      const upperText = descriptionText.toUpperCase();
      
      // Check if this is a main section (case-insensitive)
      const isMainSection = upperText.includes("SPEC") || 
                           upperText.includes("INSPECTION") || 
                           upperText.includes("DOCUMENTS") ||
                           upperText.includes("GENERAL") ||
                           upperText.includes("APPROVAL") ||
                           upperText.includes("STATIONARY") ||
                           upperText.includes("BATTERY") ||
                           upperText.includes("ACCESSORIES") ||
                           upperText.includes("MACHINE DATA") ||
                           upperText.includes("FACTORY TEST") ||
                           upperText.includes("TECHNICAL HIGHLIGHTS") ||
                           upperText.includes("COMMISSIONING") ||
                           upperText.includes("SUBMITTAL");
      
      // Get section number from item ID
      let sectionNumber = "";
      if (isLegacyHeader) {
        sectionNumber = itemId.replace('-0', '');
      } else if (isNewFormatHeader) {
        sectionNumber = itemId;
      }
      
      // Determine section color based on text (check most specific first)
      let sectionColor = "E0E0E0"; // default light gray for headers
      
      // Check for specific sections in order of specificity
      if (upperText.includes("SPEC ARRESTER")) {
        sectionColor = sectionColors['SPEC ARRESTER'];
      } else if (upperText.includes("SPEC COUNTER LA")) {
        sectionColor = sectionColors['SPEC COUNTER LA'];
      } else if (upperText.includes("INSPECTION") && upperText.includes("FACTORY")) {
        sectionColor = sectionColors['INSPECTION & TESTING REQUIREMENT AT FACTORY'];
      } else if (upperText.includes("INSPECTION") && upperText.includes("SITE")) {
        sectionColor = sectionColors['INSPECTION & TESTING REQUIREMENT AT SITE'];
      } else if (upperText.includes("DOCUMENTS REQUIREMENT")) {
        sectionColor = sectionColors['DOCUMENTS REQUIREMENT'];
      }
      
      // For section headers, create merged cell row
      if (isHeaderRow && (isMainSection || isNewFormatHeader || isLegacyHeader)) {
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: sectionNumber,
                  font: "Arial",
                  size: contentSize,
                  bold: true,
                  color: "000000"
                })],
                alignment: AlignmentType.CENTER
              })],
              margins: cellMargin,
              shading: { fill: sectionColor, color: "auto" }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: descriptionText,
                  font: "Arial",
                  size: contentSize,
                  bold: true,
                  color: "000000"
                })]
              })],
              columnSpan: columns.length, // Merge across all data columns
              margins: cellMargin,
              shading: { fill: sectionColor, color: "auto" }
            })
          ]
        });
      }
      
      // Regular data rows - no number in the No. column
      const cells = [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: "", // Empty number cell for data rows
              font: "Arial",
              size: contentSize
            })],
            alignment: AlignmentType.CENTER
          })],
          margins: cellMargin
        }),
        ...columns.map((col) => {
          // For multi-column Battery format, create nested table for specificationRequirements column
          if (isMultiColumnBattery && col.key === 'specificationRequirements') {
            // Check if any spec fields have content
            const hasSpec1 = item.spec1 && item.spec1.trim() !== "";
            const hasSpec2 = item.spec2 && item.spec2.trim() !== "";
            const hasSpec3 = item.spec3 && item.spec3.trim() !== "";
            const hasSpec4 = item.spec4 && item.spec4.trim() !== "";
            
            // If all specs are empty, just return empty cell
            if (!hasSpec1 && !hasSpec2 && !hasSpec3 && !hasSpec4) {
              return new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: contentSize })] })],
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
              });
            }
            
            // Create nested table with spec1, spec2, spec3, spec4 as columns
            const nestedTableRows: TableRow[] = [];
            
            // Single row with 4 columns (or less if some are empty)
            const nestedCells: TableCell[] = [];
            
            // Only add cells for non-empty specs
            if (hasSpec1) {
              nestedCells.push(new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: item.spec1 || "",
                    font: "Arial",
                    size: contentSize - 2, // Slightly smaller for nested content
                    color: "000000"
                  })]
                })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
              }));
            }
            
            if (hasSpec2) {
              nestedCells.push(new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: item.spec2 || "",
                    font: "Arial",
                    size: contentSize - 2,
                    color: "000000"
                  })]
                })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
              }));
            }
            
            if (hasSpec3) {
              nestedCells.push(new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: item.spec3 || "",
                    font: "Arial",
                    size: contentSize - 2,
                    color: "000000"
                  })]
                })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
              }));
            }
            
            if (hasSpec4) {
              nestedCells.push(new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: item.spec4 || "",
                    font: "Arial",
                    size: contentSize - 2,
                    color: "000000"
                  })]
                })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
              }));
            }
            
            nestedTableRows.push(new TableRow({ children: nestedCells }));
            
            const nestedTable = new Table({
              rows: nestedTableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              }
            });
            
            // Return cell containing the nested table
            return new TableCell({
              children: [nestedTable],
              margins: { top: 0, bottom: 0, left: 0, right: 0 } // No margins for nested table cell
            });
          }
          
          // Regular cells for other columns
          let cellValue = item[col.key] || "";
          
          // Remove "Harus diisi oleh vendor" placeholder text from export
          if (typeof cellValue === 'string' && cellValue.trim() === "Harus diisi oleh vendor") {
            cellValue = "";
          }
          
          return new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: cellValue,
                font: "Arial",
                size: contentSize,
                color: "000000"
              })]
            })],
            margins: cellMargin
          });
        })
      ];
      
      return new TableRow({ children: cells });
    }),
  ];
  
  return new Table({ 
    rows, 
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });
}

// Helper to generate Inspection Testing Plan (ITP) Table
function generateItpTable(items: any[]): Table {
  const cellMargin = { top: 150, bottom: 150, left: 100, right: 100 };
  const headerSize = 24; // 12pt
  const contentSize = 22; // 11pt

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Testing Items", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 18, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Testing Method", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Standard Test Reference", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 17, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tested by", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Witness by", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Acceptance Criteria Requirements", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 21, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
      ],
      tableHeader: true,
    }),
    ...items.map((item, index) => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), font: "Arial", size: contentSize })], alignment: AlignmentType.CENTER })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.testingItem || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.testingMethod || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.standardTestReference || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.testedBy || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.witnessBy || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.acceptanceCriteria || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
        ],
      })
    ),
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// Helper to generate Document Request Sheet (DRS) Table
function generateDrsTable(items: any[]): Table {
  const cellMargin = { top: 150, bottom: 150, left: 100, right: 100 };
  const headerSize = 24; // 12pt
  const contentSize = 22; // 11pt

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Document Requirement", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 60, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Document Types", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 35, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
      ],
      tableHeader: true,
    }),
    ...items.map((item, index) => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), font: "Arial", size: contentSize })], alignment: AlignmentType.CENTER })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.documentRequirement || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.documentType || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
        ],
      })
    ),
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// Helper to generate Performance Guarantee Requirement Sheet (PGRS) Table
function generatePgrsTable(items: any[]): Table {
  const cellMargin = { top: 150, bottom: 150, left: 100, right: 100 };
  const headerSize = 24; // 12pt
  const contentSize = 22; // 11pt

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Plant Item", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 19, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Performance Guarantee Parameter (s)", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 19, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Baseline Parameter (s)", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 19, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Verification Method", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 19, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Remedial Measure Allowed", bold: true, font: "Arial", size: headerSize })], alignment: AlignmentType.CENTER })], width: { size: 19, type: WidthType.PERCENTAGE }, margins: cellMargin, shading: { fill: "F3F4F6", color: "auto" } }),
      ],
      tableHeader: true,
    }),
    ...items.map((item, index) => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), font: "Arial", size: contentSize })], alignment: AlignmentType.CENTER })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.plantItem || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.performanceParameter || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.baselineParameter || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.verificationMethod || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.remedialMeasure || "", font: "Arial", size: contentSize })] })], margins: cellMargin }),
        ],
      })
    ),
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// Generate Lembar Pengesahan Table
function generateLembarPengesahanTable(
  approvalSignatures: any[],
  torTitle: string
): Array<Paragraph | Table> {
  const content: Array<Paragraph | Table> = [];
  
  // Add title (page break handled by section)
  content.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "LEMBAR PENGESAHAN",
          font: "Arial",
          size: 24,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: torTitle,
          font: "Arial",
          size: 20,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Group signatures by role
  const signaturesByRole = {
    "Dibuat oleh": approvalSignatures.filter(s => s.role === "Dibuat oleh"),
    "Diperiksa oleh": approvalSignatures.filter(s => s.role === "Diperiksa oleh"),
    "Disetujui oleh": approvalSignatures.filter(s => s.role === "Disetujui oleh"),
  };
  
  // Generate table for each signature
  Object.entries(signaturesByRole).forEach(([role, sigs]) => {
    sigs.forEach((sig: any) => {
      const dateText = sig.date ? new Date(sig.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }) : "";
      
      const rows: TableRow[] = [
        // Row 1: Role label
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: role,
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: ":",
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 2, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: [new Paragraph("")],
              width: { size: 73, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
            }),
          ],
        }),
        // Row 2: Date
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Tanggal",
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: ":",
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: dateText,
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
            }),
          ],
        }),
        // Row 3: Position (centered, merged cell)
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sig.position || "",
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: 3,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
            }),
          ],
        }),
        // Row 4: Signature space (single empty row with large height)
        new TableRow({
          height: { value: 1700, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              children: [new Paragraph("")],
              columnSpan: 3,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
            }),
          ],
        }),
        // Row 7: Name (centered, underlined, merged cell)
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sig.name || "",
                      font: "Arial",
                      size: 20,
                      underline: {},
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: 3,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
            }),
          ],
        }),
      ];
      
      content.push(
        new Table({
          rows,
          width: { size: 70, type: WidthType.PERCENTAGE },
          alignment: AlignmentType.CENTER,
        }),
        // Add spacing between tables (reduced to fit 1 page)
        new Paragraph({
          children: [new TextRun({ text: "", font: "Arial", size: 20 })],
          spacing: { before: 100, after: 100 },
        })
      );
    });
  });
  
  return content;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const torId = parseInt(id);

    const tor = await prisma.tor.findUnique({
      where: { id: torId },
      include: {
        bidang: true,
        creator: {
          include: {
            position: true,
          },
        },
        budgetItems: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    }) as any;

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    console.log("📄 Exporting TOR:", tor.title);
    console.log("   - ID:", tor.id);
    console.log("   - 🖼️  Cover Image Path:", tor.coverImage || "(none)");

    // Read Logo Images
    const plnLogoPath = path.join(process.cwd(), "public", "logo-pln-horizontal.jpg");
    const secondaryLogoPath = path.join(process.cwd(), "public", "image7.png");
    
    let plnLogoBuffer: Buffer | null = null;
    let secondaryLogoBuffer: Buffer | null = null;

    try {
      plnLogoBuffer = fs.readFileSync(plnLogoPath);
      console.log("✅ PLN Logo loaded");
    } catch (e) {
      console.error("❌ PLN Logo (logo-pln-horizontal.jpg) not found:", e);
    }

    try {
      secondaryLogoBuffer = fs.readFileSync(secondaryLogoPath);
      console.log("✅ Secondary Logo loaded");
    } catch (e) {
      console.error("❌ Secondary Logo (image7.png) not found:", e);
    }

    // Load Cover Image
    const coverImageResult = loadCoverImage(tor.coverImage);

    // Create Cover Image Paragraphs
    const coverImageParagraphs = coverImageResult.buffer 
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: coverImageResult.buffer,
                transformation: { 
                  width: 450,
                  height: 300
                },
                type: coverImageResult.type,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          })
        ]
      : [
          new Paragraph({
            children: [
              new TextRun({
                text: coverImageResult.error 
                  ? "* gambar tidak dapat dimuat" 
                  : "* gambar hanya ilustrasi",
                font: "Times New Roman",
                size: 20,
                italics: true,
                color: coverImageResult.error ? "999999" : undefined,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 2000 },
          })
        ];

    // Create Document
    const doc = new Document({
      sections: [
        // === SECTION 1: COVER PAGE ===
        {
          properties: {
            page: {
              margin: {
                top: 1701,
                right: 1558,
                bottom: 1701,
                left: 2268,
              },
            },
            titlePage: true,
          },
          headers: {
            default: new Header({
              children: [
                new Table({
                  width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                  },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        // Left Logo (PLN)
                        new TableCell({
                          width: { size: 20, type: WidthType.PERCENTAGE },
                          children: [
                            plnLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: plnLogoBuffer,
                                  transformation: { width: 80, height: 40 },
                                  type: "jpg",
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                            }) : new Paragraph(""),
                          ],
                        }),
                        // Center Text
                        new TableCell({
                          width: { size: 60, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `Term of Reference (TOR) ${tor.title}`,
                                  font: "Arial",
                                  size: 16,
                                  italics: true,
                                }),
                              ],
                              alignment: AlignmentType.CENTER,
                            }),
                          ],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                        // Right Logo
                        new TableCell({
                          width: { size: 20, type: WidthType.PERCENTAGE },
                          margins: {
                            right: 500, // Increased margin to prevent cutoff
                          },
                          children: [
                            secondaryLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: secondaryLogoBuffer,
                                  transformation: { width: 20, height: 28 },
                                  type: "png",
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                            }) : new Paragraph(""),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // Spacing
            new Paragraph({ spacing: { before: 2000 } }),

            // TERM OF REFERENCE (TOR)
            new Paragraph({
              children: [
                new TextRun({
                  text: "TERM OF REFERENCE (TOR)",
                  font: "Times New Roman",
                  size: 28,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Project Title
            new Paragraph({
              children: [
                new TextRun({
                  text: tor.title,
                  font: "Times New Roman",
                  size: 40,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 },
            }),

            // Cover Image
            ...coverImageParagraphs,

            // Spacing
            new Paragraph({ spacing: { before: 2000 } }),

            // Bottom Footer Text
            new Paragraph({
              children: [
                new TextRun({
                  text: "PT PLN INDONESIA POWER",
                  font: "Times New Roman",
                  size: 24,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "UBP CILEGON",
                  font: "Times New Roman",
                  size: 24,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `TAHUN ${tor.creationYear || new Date().getFullYear()}`,
                  font: "Times New Roman",
                  size: 24,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },

        // === SECTION 2: MAIN CONTENT ===
        {
          properties: {
            page: {
              margin: {
                top: 1701,
                right: 1558,
                bottom: 1701,
                left: 2268,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.SINGLE, size: 6 },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        // Left: Logo + Text
                        new TableCell({
                          width: { size: 80, type: WidthType.PERCENTAGE },
                          children: [
                            plnLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: plnLogoBuffer,
                                  transformation: { width: 136, height: 40 },
                                  type: "jpg",
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                            }) : new Paragraph(""),
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `Term of Reference (TOR) ${tor.title}`,
                                  font: "Arial",
                                  size: 16,
                                  italics: true,
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                              spacing: { before: 100 },
                            }),
                          ],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                        // Right: Secondary Logo
                        new TableCell({
                          width: { size: 20, type: WidthType.PERCENTAGE },
                          children: [
                            secondaryLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: secondaryLogoBuffer,
                                  transformation: { width: 29, height: 41 },
                                  type: "png",
                                }),
                              ],
                              alignment: AlignmentType.RIGHT,
                            }) : new Paragraph(""),
                          ],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: ["Halaman ", PageNumber.CURRENT, " dari ", PageNumber.TOTAL_PAGES],
                      font: "Arial",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          children: [
            // 1. Pendahuluan
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. PENDAHULUAN",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.introduction),

            // 2. Latar Belakang
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. LATAR BELAKANG",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.background),

            // 3. Tujuan
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. TUJUAN",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.objective),

            // 4. Ruang Lingkup
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. RUANG LINGKUP PEKERJAAN",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.scope),

            // 5. Garansi
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. GARANSI",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.warranty),

            // 6. Kriteria yang Diterima
            new Paragraph({
              children: [
                new TextRun({
                  text: "6. KRITERIA YANG DITERIMA",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.acceptanceCriteria),

            // 7. TAHAPAN PEKERJAAN & Project Time Schedule
            new Paragraph({
              children: [
                new TextRun({
                  text: "7. TAHAPAN PEKERJAAN & Project Time Schedule",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            generateWorkStagesTable(tor.workStagesData),
            new Paragraph({ children: [], spacing: { after: 200 } }),
            ...parseHtmlToParagraphs(tor.workStagesExplanation),

            // 8. PERSYARATAN PENGIRIMAN
            new Paragraph({
              children: [
                new TextRun({
                  text: "8. PERSYARATAN PENGIRIMAN",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.deliveryRequirements),

            // 9. TITIK SERAH TERIMA
            new Paragraph({
              children: [
                new TextRun({
                  text: "9. TITIK SERAH TERIMA",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.handoverPoint),

            // 10. MEKANISME SERAH TERIMA
            new Paragraph({
              children: [
                new TextRun({
                  text: "10. MEKANISME SERAH TERIMA",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...parseHtmlToParagraphs(tor.handoverMechanism),

            // ✅ 11. USULAN PELAKSANA DIREKSI (line ~1150)
new Paragraph({
  children: [
    new TextRun({
      text: "11. USULAN PELAKSANA DIREKSI PEKERJAAN DAN DIREKSI LAPANGAN",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),

// Parse directorProposals and fieldDirectorProposals
...(() => {
  const directorProposals = tor.directorProposals || [];
  const fieldDirectorProposals = tor.fieldDirectorProposals || [];
  
  // Validate array types
  if (!Array.isArray(directorProposals) || !Array.isArray(fieldDirectorProposals)) {
    return [new Paragraph({ 
      children: [new TextRun({ text: "-", font: "Arial", size: 20 })],
      spacing: { after: 100 }
    })];
  }
  
  // If both are empty
  if (directorProposals.length === 0 && fieldDirectorProposals.length === 0) {
    return [new Paragraph({ 
      children: [new TextRun({ text: "-", font: "Arial", size: 20 })],
      spacing: { after: 100 }
    })];
  }
  
  const paragraphs: Paragraph[] = [];
  
  // Add "Direksi Pekerjaan:" label
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ 
          text: "Direksi Pekerjaan: ", 
          bold: true, 
          font: "Arial", 
          size: 20,
          underline: {}
        }),
      ],
      spacing: { after: 50 },
    })
  );
  
  // List all directorProposals
  directorProposals.forEach((director: any, i: number) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: director.name || "-", 
            font: "Arial", 
            size: 20 
          }),
        ],
        spacing: { after: 50 },
      })
    );
  });
  
  // Add spacing
  paragraphs.push(new Paragraph({ children: [], spacing: { after: 100 } }));
  
  // Add "Direksi Lapangan:" label
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ 
          text: "Direksi Lapangan: ", 
          bold: true, 
          font: "Arial", 
          size: 20,
          underline: {}
        }),
      ],
      spacing: { after: 50 },
    })
  );
  
  // List all fieldDirectorProposals
  fieldDirectorProposals.forEach((director: any, i: number) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: director.name || "-", 
            font: "Arial", 
            size: 20 
          }),
        ],
        spacing: { after: 50 },
      })
    );
  });
  
  return paragraphs;
})(),

// ✅ 12. PERSYARATAN CALON PENYEDIA
new Paragraph({
  children: [
    new TextRun({
      text: "12. PERSYARATAN CALON PENYEDIA",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.vendorRequirements),

// ✅ 13. USULAN METODE PENGADAAN
new Paragraph({
  children: [
    new TextRun({
      text: "13. USULAN METODE PENGADAAN",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.procurementMethod),

// ✅ 14. USULAN ATURAN PEMBAYARAN
new Paragraph({
  children: [
    new TextRun({
      text: "14. USULAN ATURAN PEMBAYARAN",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.paymentTerms),

// ✅ 15. USULAN ATURAN DENDA
new Paragraph({
  children: [
    new TextRun({
      text: "15. USULAN ATURAN DENDA",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.penaltyRules),

// ✅ 16. RENCANA ANGGARAN (MOVED FROM 11)
new Paragraph({
  children: [
    new TextRun({
      text: "16. RENCANA ANGGARAN",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),

// Budget Table
new Table({
  width: {
    size: 100,
    type: WidthType.PERCENTAGE,
  },
  rows: [
    // Header
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 5, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Quantity", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Order Unit", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `Unit price ${tor.budgetCurrency || "IDR"}`, bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `Total Price ${tor.budgetCurrency || "IDR"}`, bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: "D3D3D3", color: "auto" },
        }),
      ],
    }),
    // Items
    ...tor.budgetItems.map((item: any, index: number) => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item, font: "Arial", size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.quantity.toString(), font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.unit, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: Number(item.unitPrice).toLocaleString("id-ID"), font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: Number(item.totalPrice).toLocaleString("id-ID"), font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })] }),
        ],
      })
    ),
    // Total Row
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
          columnSpan: 5,
        }),
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: tor.subtotal ? Number(tor.subtotal).toLocaleString("id-ID") : "0", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
        }),
      ],
    }),
    // PPN Row
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: tor.ppnIncluded === false ? "PPN (Exclude)" : `PPN ${tor.ppnRate || 11}%`, bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
          columnSpan: 5,
        }),
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: tor.ppn ? Number(tor.ppn).toLocaleString("id-ID") : "0", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
        }),
      ],
    }),
    // Grand Total Row
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: "Grand Total", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
          columnSpan: 5,
        }),
        new TableCell({ 
          children: [new Paragraph({ children: [new TextRun({ text: tor.grandTotal ? Number(tor.grandTotal).toLocaleString("id-ID") : "0", bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.RIGHT })],
        }),
      ],
    }),
  ],
  borders: {
    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  },
}),

// Summary text
new Paragraph({
  children: [
    new TextRun({
      text: `Rencana anggaran sebesar ${tor.budgetCurrency || "IDR"} ${tor.grandTotal ? Number(tor.grandTotal).toLocaleString("id-ID") : "0"},00 ${tor.ppnIncluded === false ? "tidak termasuk PPN" : `termasuk PPN ${tor.ppnRate || 11}%`}.`,
      font: "Arial",
      size: 20,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),

// ✅ 17. PERSYARATAN LAINNYA
new Paragraph({
  children: [
    new TextRun({
      text: "17. PERSYARATAN LAINNYA",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.otherRequirements),

// ✅ 18. RISK ASSESSMENT
new Paragraph({
  children: [
    new TextRun({
      text: "18. RISK ASSESSMENT",
      font: "Arial",
      size: 20,
      bold: true,
    }),
  ],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.riskAssessment),

new Paragraph({
  children: [new TextRun({ text: "19. REVISI TERM OF REFERENCE", font: "Arial", size: 20, bold: true })],
  spacing: { before: 200, after: 100 },
}),
...parseHtmlToParagraphs(tor.revisionTermOfReference),



            // Parse directorProposals and fieldDirectorProposals
            ...(() => {
              const directorProposals = tor.directorProposals || [];
              const fieldDirectorProposals = tor.fieldDirectorProposals || [];
              
              // Validate array types
              if (!Array.isArray(directorProposals) || !Array.isArray(fieldDirectorProposals)) {
                return [new Paragraph({ 
                  children: [new TextRun({ text: "-", font: "Arial", size: 20 })],
                  spacing: { after: 100 }
                })];
              }
              
              // If both are empty
              if (directorProposals.length === 0 && fieldDirectorProposals.length === 0) {
                return [new Paragraph({ 
                  children: [new TextRun({ text: "-", font: "Arial", size: 20 })],
                  spacing: { after: 100 }
                })];
              }
              
              const paragraphs: Paragraph[] = [];
              
              // Combine both arrays
              const maxLength = Math.max(directorProposals.length, fieldDirectorProposals.length);
              
              for (let i = 0; i < maxLength; i++) {
                const directorWork = directorProposals[i]?.name || "-";
                const directorField = fieldDirectorProposals[i]?.name || "-";
              }
              
              return paragraphs;
            })(),
          ],
        },
        // === SECTION 2: LEMBAR PENGESAHAN (No Header) ===
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [],
            }),
          },
          children: [
            ...generateLembarPengesahanTable(
              tor.approvalSignatures || [],
              tor.program || tor.title
            ),
          ],
        },
        // === SECTION 3: LAMPIRAN (With Header) ===
        {
          properties: {
            page: {
              margin: {
                top: 1701,
                right: 1558,
                bottom: 1701,
                left: 2268,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.SINGLE, size: 6 },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        // Left: Logo + Text
                        new TableCell({
                          width: { size: 80, type: WidthType.PERCENTAGE },
                          children: [
                            plnLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: plnLogoBuffer,
                                  transformation: { width: 136, height: 40 },
                                  type: "jpg",
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                            }) : new Paragraph(""),
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: `Term of Reference (TOR) ${tor.title}`,
                                  font: "Arial",
                                  size: 16,
                                  italics: true,
                                }),
                              ],
                              alignment: AlignmentType.LEFT,
                              spacing: { before: 100 },
                            }),
                          ],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                        // Right: Secondary Logo
                        new TableCell({
                          width: { size: 20, type: WidthType.PERCENTAGE },
                          children: [
                            secondaryLogoBuffer ? new Paragraph({
                              children: [
                                new ImageRun({
                                  data: secondaryLogoBuffer,
                                  transformation: { width: 29, height: 41 },
                                  type: "png",
                                }),
                              ],
                              alignment: AlignmentType.RIGHT,
                            }) : new Paragraph(""),
                          ],
                          verticalAlign: VerticalAlign.CENTER,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: ["Halaman ", PageNumber.CURRENT],
                      font: "Arial",
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // LAMPIRAN Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "LAMPIRAN",
                  font: "Arial",
                  size: 24,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 400 },
            }),

            // 1. Technical Particular & Guarantee (TPG)
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. Technical Particular & Guarantee (TPG)",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            ...((tor.technicalParticulars && Array.isArray(tor.technicalParticulars) && tor.technicalParticulars.length > 0)
              ? (() => {
                  // Detect Battery template (has spec1 or vendorPTX fields)
                  const isBatteryTemplate = tor.technicalParticulars.some((item: any) => 
                    'spec1' in item || 'vendorPTX' in item
                  );
                  
                  if (isBatteryTemplate) {
                    // Use custom Battery table generator for exact layout
                    return [generateBatteryTable()];
                  } else {
                    // Use generic TPG table for other templates (Arrester, AVR, etc.)
                    return [generateTpgTable(tor.technicalParticulars)];
                  }
                })()
              : [new Paragraph({ text: "-", spacing: { after: 200 } })]),

            // 2. Inspection Testing Plan (ITP)
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. Inspection Testing Plan (ITP)",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 400, after: 100 },
            }),
            ...((tor.inspectionTestingPlans && Array.isArray(tor.inspectionTestingPlans) && tor.inspectionTestingPlans.length > 0)
              ? [generateItpTable(tor.inspectionTestingPlans)]
              : [new Paragraph({ text: "-", spacing: { after: 200 } })]),

            // 3. Document Request Sheet (DRS)
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. Document Request Sheet (DRS)",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 400, after: 100 },
            }),
            ...((tor.documentRequestSheets && Array.isArray(tor.documentRequestSheets) && tor.documentRequestSheets.length > 0)
              ? [generateDrsTable(tor.documentRequestSheets)]
              : [new Paragraph({ text: "-", spacing: { after: 200 } })]),

            // 4. Performance Guarantee Requirement Sheet (PGRS)
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. Performance Guarantee Requirement Sheet (PGRS)",
                  font: "Arial",
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { before: 400, after: 100 },
            }),
            ...((tor.performanceGuarantees && Array.isArray(tor.performanceGuarantees) && tor.performanceGuarantees.length > 0)
              ? [generatePgrsTable(tor.performanceGuarantees)]
              : [new Paragraph({ text: "-", spacing: { after: 200 } })]),

            new Paragraph({
              children: [new TextRun({ text: "5. FILE LAMPIRAN", font: "Arial", size: 20, bold: true })],
              spacing: { before: 400, after: 100 },
            }),
            ...((Array.isArray(tor.attachments) && tor.attachments.length > 0)
              ? tor.attachments.map((file: any, index: number) => new Paragraph({
                  children: [new TextRun({ text: `${index + 1}. ${file.name || file.filename} (${file.type || "file"})`, font: "Arial", size: 20 })],
                  spacing: { after: 80 },
                }))
              : [new Paragraph({ text: "-", spacing: { after: 200 } })]),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    console.log("✅ Document export successful!");

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="TOR-${tor.number || 'draft'}.docx"`,
      },
    });
  } catch (error) {
    console.error("❌ Export error:", error);
    return NextResponse.json(
      { message: "Failed to export ToR", error: String(error) },
      { status: 500 }
    );
  }
}