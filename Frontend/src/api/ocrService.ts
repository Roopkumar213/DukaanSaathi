import Tesseract from 'tesseract.js';

export interface ExtractedStockItem {
  id: string;
  product: string;
  quantity: number;
  unit: string;
  price?: number;
  category?: string;
  confidence: number;
  needsReview: boolean;
  rawLine?: string;
}

export interface OCRProgress {
  progress: number;
  status: string;
}

// Common Kirana unit normalization
const UNIT_MAP: Record<string, string> = {
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  gm: 'g',
  gms: 'g',
  g: 'g',
  gram: 'g',
  grams: 'g',
  l: 'L',
  lt: 'L',
  ltr: 'L',
  ltrs: 'L',
  liter: 'L',
  liters: 'L',
  litre: 'L',
  litres: 'L',
  ml: 'ml',
  packet: 'packets',
  packets: 'packets',
  pkt: 'packets',
  pkts: 'packets',
  pouch: 'packets',
  pouches: 'packets',
  pcs: 'pcs',
  pc: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  nos: 'pcs',
  no: 'pcs',
  box: 'boxes',
  boxes: 'boxes',
  bag: 'bags',
  bags: 'bags',
  sack: 'bags',
  sacks: 'bags',
  tin: 'tins',
  tins: 'tins',
  bottle: 'bottles',
  bottles: 'bottles',
  btl: 'bottles',
  doz: 'dozen',
  dozen: 'dozen',
};

// Lines to ignore from bills
const IGNORE_PATTERNS = [
  /invoice/i,
  /bill\s*(no|number|date)/i,
  /gstin/i,
  /tax\s*invoice/i,
  /sub\s*total/i,
  /grand\s*total/i,
  /total\s*amount/i,
  /cash\s*memo/i,
  /delivery\s*challan/i,
  /tel|ph(one)?|mob(ile)?/i,
  /address|road|street|nagar|bazar|market/i,
  /signature|authorised/i,
  /thank\s*you/i,
  /visit\s*again/i,
  /terms\s*&\s*conditions/i,
  /date\s*:\s*\d+/i,
  /^-+$/,
  /^=+$/,
];

export async function processStockImage(
  imageSource: File | Blob | string,
  onProgress?: (p: OCRProgress) => void
): Promise<{ text: string; items: ExtractedStockItem[]; confidence: number }> {
  try {
    if (onProgress) {
      onProgress({ progress: 5, status: 'Initializing OCR engine...' });
    }

    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.min(95, Math.round((m.progress || 0) * 90) + 5);
          onProgress?.({ progress: pct, status: `Recognizing text... ${pct}%` });
        } else if (m.status === 'loading tesseract core') {
          onProgress?.({ progress: 15, status: 'Loading OCR core...' });
        } else if (m.status === 'initializing tesseract') {
          onProgress?.({ progress: 25, status: 'Calibrating character models...' });
        }
      },
    });

    onProgress?.({ progress: 98, status: 'Parsing inventory entries...' });
    const rawText = result.data.text || '';
    const items = parseKiranaReceiptText(rawText);

    onProgress?.({ progress: 100, status: 'Complete' });
    return {
      text: rawText,
      items,
      confidence: Math.round(result.data.confidence || 0),
    };
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    throw new Error(error?.message || 'Failed to process document image with OCR');
  }
}

export function parseKiranaReceiptText(rawText: string): ExtractedStockItem[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ExtractedStockItem[] = [];

  for (const line of lines) {
    // Check if line should be skipped
    if (IGNORE_PATTERNS.some(pat => pat.test(line))) {
      continue;
    }

    // Skip if line has less than 3 chars or only symbols
    if (line.length < 3 || /^[^a-zA-Z0-9]+$/.test(line)) {
      continue;
    }

    // Pattern 1: Match item name, quantity, unit, and optional price
    // Example: "Rice 25 kg @ 45" or "Basmati Rice - 10kg 1200" or "Tata Salt 15 pkts 300"
    const standardRegex = /^([a-zA-Z\s&.'\-]+?)\s*[-:]?\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?(?:\s*(?:@|rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?$/i;
    
    // Pattern 2: Tabular or spaced format: "25 kg Rice" or "10 x Sugar"
    const leadingQtyRegex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(?:x|-)?\s*([a-zA-Z\s&.'\-]+)(?:\s*(?:@|rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?$/i;

    let matchedName = '';
    let matchedQty = 1;
    let matchedUnit = 'pcs';
    let matchedPrice: number | undefined;
    let needsReview = false;
    let confidence = 85;

    const stdMatch = line.match(standardRegex);
    const leadMatch = !stdMatch ? line.match(leadingQtyRegex) : null;

    if (stdMatch) {
      matchedName = cleanItemName(stdMatch[1]);
      matchedQty = parseFloat(stdMatch[2]) || 1;
      const rawUnit = (stdMatch[3] || '').toLowerCase();
      matchedUnit = UNIT_MAP[rawUnit] || (rawUnit.length > 0 ? rawUnit : 'pcs');
      if (stdMatch[4]) {
        matchedPrice = parseFloat(stdMatch[4]);
      }
      if (!UNIT_MAP[rawUnit] && rawUnit.length > 0) {
        needsReview = true;
        confidence = 65;
      }
    } else if (leadMatch) {
      matchedQty = parseFloat(leadMatch[1]) || 1;
      const rawUnit = (leadMatch[2] || '').toLowerCase();
      matchedUnit = UNIT_MAP[rawUnit] || (rawUnit.length > 0 ? rawUnit : 'pcs');
      matchedName = cleanItemName(leadMatch[3]);
      if (leadMatch[4]) {
        matchedPrice = parseFloat(leadMatch[4]);
      }
      if (!UNIT_MAP[rawUnit] && rawUnit.length > 0) {
        needsReview = true;
        confidence = 65;
      }
    } else {
      // Fallback: Line might be just product name or noisy OCR
      // e.g. "Toor Dal 10" or "Sunflower Oil"
      const numMatch = line.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        matchedQty = parseFloat(numMatch[1]) || 1;
        matchedName = cleanItemName(line.replace(numMatch[0], ''));
        matchedUnit = 'pcs';
        needsReview = true;
        confidence = 50;
      } else {
        matchedName = cleanItemName(line);
        matchedQty = 1;
        matchedUnit = 'pcs';
        needsReview = true;
        confidence = 40;
      }
    }

    if (matchedName.length >= 2 && !/^\d+$/.test(matchedName)) {
      items.push({
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        product: formatTitleCase(matchedName),
        quantity: matchedQty,
        unit: matchedUnit,
        price: matchedPrice,
        category: guessCategory(matchedName),
        confidence,
        needsReview: needsReview || matchedQty <= 0,
        rawLine: line,
      });
    }
  }

  return items;
}

function cleanItemName(str: string): string {
  return str
    .replace(/^[\d\s.\-*:|]+/, '')
    .replace(/[\s.\-*:|]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/rice|atta|wheat|dal|flour|maida|sooji|grain|pulse|chana|moong|urad|toor|sugar|salt|oil|ghee|spice|mirchi|haldi|jeera|mustard/.test(n)) {
    return 'Grains & Staples';
  }
  if (/biscuit|chips|namkeen|cookie|snack|maggi|noodle|pasta|chocolate|cake/.test(n)) {
    return 'Packaged Food';
  }
  if (/soap|shampoo|surf|detergent|vim|paste|brush|colgate|rin|ariel|dettol|cleaner/.test(n)) {
    return 'Personal & Home Care';
  }
  if (/milk|curd|butter|paneer|cheese|bread|egg/.test(n)) {
    return 'Dairy & Bakery';
  }
  if (/tea|coffee|juice|coke|pepsi|water|drink|bournvita|horlicks/.test(n)) {
    return 'Beverages';
  }
  return 'General Store';
}

/**
 * Creates a high-fidelity visual sample Kirana Stock Inward Slip as a Data URL
 * so users can immediately test real OCR scanning in browser without needing an external photo!
 */
export function createSampleStockSlipDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 780;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Realistic aged cream paper
  ctx.fillStyle = '#FBF9F3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint ledger ruled lines
  ctx.strokeStyle = '#E8E2D2';
  ctx.lineWidth = 1;
  for (let y = 140; y < canvas.height - 60; y += 36) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
  }

  // Margin line
  ctx.strokeStyle = '#F3D6D6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(70, 30);
  ctx.lineTo(70, canvas.height - 30);
  ctx.stroke();

  // Header
  ctx.font = 'bold 22px Courier, monospace';
  ctx.fillStyle = '#1A202C';
  ctx.fillText('MAHALAXMI TRADERS & WHOLESALE', 90, 60);

  ctx.font = '13px Courier, monospace';
  ctx.fillStyle = '#4A5568';
  ctx.fillText('STOCK INWARD SLIP - KRISHNA MARKET', 90, 85);
  ctx.fillText('DATE: 21-SEP-2026   CHALLAN # 4920', 90, 105);

  // Table header
  ctx.font = 'bold 14px Courier, monospace';
  ctx.fillStyle = '#2D3748';
  ctx.fillText('ITEM PARTICULARS          QTY    UNIT   RATE (Rs)', 90, 150);

  // Items
  const sampleItems = [
    { text: 'Basmati Rice 5-Star      25     kg     1250', y: 186 },
    { text: 'Madhur Sugar M-30        20     kg     840', y: 222 },
    { text: 'Fortune Sunflower Oil    15     L      1950', y: 258 },
    { text: 'Tata Sampann Toor Dal    10     kg     1450', y: 294 },
    { text: 'Surf Excel Easy Wash     12     pkts   720', y: 330 },
    { text: 'Tata Tea Gold Leaf       6      kg     1800', y: 366 },
    { text: 'Aashirvaad Shudh Atta    10     bags   3400', y: 402 },
    { text: 'Colgate Strong Teeth     24     pcs    1200', y: 438 },
  ];

  ctx.font = '15px Courier, monospace';
  ctx.fillStyle = '#1A202C';
  sampleItems.forEach(item => {
    ctx.fillText(item.text, 90, item.y);
  });

  // Stamp / note
  ctx.font = 'italic 13px Courier, monospace';
  ctx.fillStyle = '#718096';
  ctx.fillText('Goods received in good condition.', 90, 520);
  ctx.fillText('Authorized Signature: ____________', 90, 560);

  // Realistic ink stamp
  ctx.save();
  ctx.translate(450, 530);
  ctx.rotate(-0.12);
  ctx.strokeStyle = '#3182CE';
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -25, 150, 50);
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#3182CE';
  ctx.fillText('STOCK VERIFIED', 10, -5);
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('DUKAAN INWARD', 18, 12);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
