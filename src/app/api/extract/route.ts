import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const prompt = `Analiza esta imagen de un cuaderno de control de gastos e ingresos de transporte.
Extrae TODOS los datos y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "date": "YYYY-MM-DD",
  "km": "kilometraje o null",
  "trips": [
    {
      "routeFrom": "origen",
      "routeTo": "destino",
      "time": "HH:MM o null",
      "income": 0.00,
      "boletoLocal": 0.00,
      "boletoUrbano": 0.00,
      "boletoMuni": 0.00
    }
  ],
  "production": 0.00,
  "libres": 0.00,
  "tickets": 0.00,
  "cajaComun": 0.00,
  "gastos": {
    "chofex": 0.00,
    "ayudante": 0.00,
    "diesel": 0.00,
    "planRenova": 0.00,
    "multaTransito": 0.00,
    "otherExpenses": 0.00,
    "otherExpDesc": ""
  },
  "totalGastos": 0.00,
  "totalIngresos": 0.00,
  "balance": 0.00
}

Instrucciones:
- Lee TODOS los valores numéricos de la imagen
- Si no puedes leer un valor, usa 0
- Los campos de boleto pueden llamarse B.L, B.U, B.M en la imagen - mapealos a boletoLocal, boletoUrbano, boletoMuni
- production es la suma total de ingresos por pasaje de todos los viajes
- Los gastos individual son: chofex, ayudante, diesel, planRenova, multaTransito, otherExpenses
- totalGastos es la suma de todos los gastos
- libres, tickets, cajaComun son ingresos adicionales
- Devuelve SOLO el JSON, nada más`;

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response.choices[0]?.message?.content || '';

    // Try to parse the JSON from the response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON de la respuesta de la IA');
      }
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error extracting data from image:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
