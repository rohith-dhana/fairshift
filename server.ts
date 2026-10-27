import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
  }

  record.count++;
  next();
}

app.use('/api', rateLimiter);

// Health check endpoint for Cloud Run and container liveness
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fairshift-platform',
    version: '1.0.0',
    port: PORT,
  });
});

// Initialize Gemini Client server-side
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Hazard Categorization & Severity Assessment with Gemini
app.post('/api/gemini/categorize-hazard', async (req: Request, res: Response) => {
  try {
    const { description, sector, categories, photoBase64 } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Description is required' });
    }

    const sanitizedDescription = description.trim().slice(0, 1000);
    const categoryList = Array.isArray(categories) && categories.length > 0 ? categories : [];

    // Fallback classification logic if no AI or API error
    const getFallback = () => {
      const lower = sanitizedDescription.toLowerCase();
      // Hospital checks
      if (lower.includes('needle') || lower.includes('sharp') || lower.includes('poke') || lower.includes('prick')) {
        return {
          categoryId: 'needle_stick',
          categoryName: 'Needle-stick or Sharps Injury',
          severity: 'high',
          explanation: 'Immediate risk of bloodborne pathogen transmission.',
          recommendedAction: 'Wash puncture site with soap and water; report to supervisor for immediate PEP within 2 hours.',
        };
      }
      if (lower.includes('blood') || lower.includes('biohazard') || lower.includes('spill') || lower.includes('fluid') || lower.includes('waste')) {
        return {
          categoryId: 'biohazard',
          categoryName: 'Biohazard / Biomedical Waste Spill',
          severity: 'high',
          explanation: 'Infectious materials require containment and chemical disinfection.',
          recommendedAction: 'Cordon off area, notify sanitation with 1% hypochlorite spill kit, double-bag.',
        };
      }
      if (lower.includes('violence') || lower.includes('hit') || lower.includes('threat') || lower.includes('yell') || lower.includes('attack') || lower.includes('abuse')) {
        return {
          categoryId: 'workplace_violence',
          categoryName: 'Workplace Violence / Agitated Patient Event',
          severity: 'high',
          explanation: 'Personal safety threat requiring immediate security intervention.',
          recommendedAction: 'Move to safe station, trigger code purple / notify hospital security.',
        };
      }
      if (lower.includes('slip') || lower.includes('wet') || lower.includes('water') || lower.includes('fall')) {
        return {
          categoryId: 'slip_hazard',
          categoryName: 'Slip / Trip Hazard',
          severity: 'low',
          explanation: 'Physical tripping or slipping hazard.',
          recommendedAction: 'Place caution wet floor signage and mop area dry.',
        };
      }
      if (lower.includes('wire') || lower.includes('electric') || lower.includes('shock') || lower.includes('plug') || lower.includes('spark')) {
        return {
          categoryId: 'electrical_hazard',
          categoryName: 'Electrical Hazard / Exposed Wiring',
          severity: 'medium',
          explanation: 'Potential shock or fire hazard.',
          recommendedAction: 'Isolate circuit breaker and place Lockout-Tagout sign.',
        };
      }

      // Default first category or medium severity
      const firstCat = categoryList[0] || { id: 'general_safety', nameKey: 'General Safety Hazard', defaultSeverity: 'medium' };
      return {
        categoryId: firstCat.id,
        categoryName: firstCat.nameKey || 'Safety Hazard',
        severity: firstCat.defaultSeverity || 'medium',
        explanation: 'Worker reported hazard requiring supervisor attention.',
        recommendedAction: 'Notify department supervisor and record in safety log.',
      };
    };

    if (!aiClient) {
      return res.json(getFallback());
    }

    const categoryDescriptions = categoryList.map(c => `ID: "${c.id}", Name: "${c.nameKey || c.id}", DefaultSeverity: "${c.defaultSeverity}"`).join('\n');

    const prompt = `You are an expert occupational health and safety officer for the "${sector}" sector under UN SDG 8 (Decent Work and Safe Workplaces).
Analyze this worker's reported safety hazard:
"${sanitizedDescription}"

Valid categories for this sector are:
${categoryDescriptions}

Rules:
1. Select the MOST ACCURATE category ID from the list.
2. Assign severity: 'low' | 'medium' | 'high' | 'critical'. (Note: Needle-stick, biohazard, and workplace violence MUST be 'high' or 'critical').
3. Provide a brief 1-sentence explanation of the hazard.
4. Provide a clear 1-sentence recommended action for the supervisor/worker.

Return strictly JSON matching this structure:
{
  "categoryId": "category id",
  "categoryName": "readable category name",
  "severity": "low" | "medium" | "high" | "critical",
  "explanation": "concise explanation",
  "recommendedAction": "immediate step to resolve"
}`;

    const parts: any[] = [{ text: prompt }];

    if (photoBase64 && typeof photoBase64 === 'string') {
      const cleanBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch {
      return res.json(getFallback());
    }
  } catch (err: any) {
    console.error('Gemini hazard categorization error:', err?.message || err);
    // Graceful fallback so user is never blocked
    return res.json({
      categoryId: 'general_safety',
      categoryName: 'Safety Hazard',
      severity: 'medium',
      explanation: 'Hazard reported and queued for supervisor review.',
      recommendedAction: 'Exercise caution and notify the shift supervisor.',
    });
  }
});

// 2. Multilingual Payslip Explanation with Gemini
app.post('/api/gemini/explain-payslip', async (req: Request, res: Response) => {
  try {
    const { payslip, language = 'en', workerName = 'Worker' } = req.body;

    if (!payslip) {
      return res.status(400).json({ error: 'Payslip data is required' });
    }

    const langNameMap: Record<string, string> = {
      en: 'English',
      ta: 'Tamil (தமிழ்)',
      hi: 'Hindi (हिन्दी)',
      te: 'Telugu (తెలుగు)',
    };

    const targetLang = langNameMap[language] || 'English';

    // Fallback explanations if AI is unavailable
    const getFallbackExplanation = () => {
      const net = payslip.netPay;
      const ot = payslip.overtimePay || 0;
      const night = payslip.nightAllowancePay || 0;
      const curr = payslip.currencySymbol || '₹';

      if (language === 'ta') {
        return `வணக்கம் ${workerName}. இந்த மாதம் உங்களின் நிகர சம்பளம் ${curr}${net}. இதில் சாதாரண ஊதியத்துடன், ${curr}${ot} கூடுதல் நேர ஊதியமும் (OT), ${curr}${night} இரவுப் பணியின் தனிப்படியும் நியாயமாகச் சேர்க்கப்பட்டுள்ளது. PF மற்றும் ESI பிடித்தங்களுக்குப் பிறகு இந்த முழுத் தொகையும் உங்கள் வங்கிக் கணக்கில் நேரடியாக வரவு வைக்கப்படும்.`;
      }
      if (language === 'hi') {
        return `नमस्ते ${workerName}. इस महीने आपका कुल शुद्ध वेतन ${curr}${net} है। इसमें आपके सामान्य घंटों के अलावा, ${curr}${ot} ओवरटाइम और ${curr}${night} नाइट शिफ्ट का विशेष भत्ता शामिल है। पीएफ और ईएसआई कटौतियों के बाद यह पूरी राशि आपके खाते में भेजी जा रही है।`;
      }
      if (language === 'te') {
        return `నమస్కారం ${workerName}. ఈ నెలలో మీ నికర చేతికి వచ్చే జీతం ${curr}${net}. ఇందులో సాధారణ వేతనంతో పాటు ${curr}${ot} ఓవర్‌టైమ్ మరియు ${curr}${night} నైట్ అలవెన్స్ కూడా ఉన్నాయి. పీఎఫ్ మరియు ఈఎస్ఐ తగ్గింపుల తర్వాత ఈ మొత్తం మీ ఖాతాలో జమ చేయబడుతుంది.`;
      }
      return `Hello ${workerName}. Your total take-home pay for this period is ${curr}${net}. This includes your regular duty hours, ${curr}${ot} in overtime earnings, and a dedicated night shift allowance of ${curr}${night}. After statutory PF and health deductions, the net amount is ready for direct deposit.`;
    };

    if (!aiClient) {
      return res.json({ explanation: getFallbackExplanation() });
    }

    const prompt = `You are a warm, supportive, and crystal-clear frontline workforce advocate explaining a payslip to a shift worker named ${workerName}.
Payslip details:
- Base Regular Pay: ${payslip.currencySymbol}${payslip.basePay} (${payslip.regularHours} hours at ${payslip.currencySymbol}${payslip.baseHourlyRate}/hr)
- Overtime Earnings: ${payslip.currencySymbol}${payslip.overtimePay} (${payslip.overtimeHours} hours at 1.5x)
- Night Shift Allowance: ${payslip.currencySymbol}${payslip.nightAllowancePay} (${payslip.nightShiftCount} night shifts)
- Statutory Deductions (PF, Health): ${payslip.currencySymbol}${payslip.totalDeductions}
- Net Take-Home Pay: ${payslip.currencySymbol}${payslip.netPay}

Write EXACTLY 2 to 3 plain, encouraging, easy-to-understand sentences in ${targetLang}.
Highlight how their night allowance and overtime hours were fairly paid.
Do not use technical jargon or complicated tables. Write directly in natural ${targetLang}.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const explanation = response.text?.trim() || getFallbackExplanation();
    return res.json({ explanation });
  } catch (err: any) {
    console.error('Gemini payslip explanation error:', err?.message || err);
    const { payslip, language = 'en', workerName = 'Worker' } = req.body || {};
    const curr = payslip?.currencySymbol || '₹';
    const net = payslip?.netPay || 0;
    return res.json({
      explanation: `Hello ${workerName}. Your total net pay is ${curr}${net}, fully accounting for your regular shift hours, night shift allowances, and statutory benefits.`,
    });
  }
});

// Setup dev server with Vite middlewares, or static serving in production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`FairShift server running on http://0.0.0.0:${PORT} [${isProduction ? 'production' : 'development'}]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
