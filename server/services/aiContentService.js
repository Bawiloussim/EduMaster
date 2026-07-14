// Some Node builds ship a broken global Headers/fetch (throws
// "webidl.util.markAsUncloneable is not a function" from node:internal/deps/undici)
// — swap in a standalone undici before the SDK is constructed so header building
// never touches the broken internal copy.
const { Headers, fetch, Request, Response } = require('undici');
globalThis.Headers = Headers;
globalThis.fetch = fetch;
globalThis.Request = Request;
globalThis.Response = Response;

const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const ensureConfigured = () => {
  if (!client) throw new Error("Génération IA non configurée sur le serveur");
};

// Anthropic errors carry the useful text in e.error.error.message — surface
// that instead of the raw JSON blob e.message would otherwise show the user.
const callClaude = async (params) => {
  try {
    return await client.messages.create(params);
  } catch (e) {
    throw new Error(e.error?.error?.message || e.message || 'Échec de la génération');
  }
};

// Turns a formateur's bullet points into a full exercise statement.
exports.generateExerciseStatement = async ({ lessonTitle, subject, classe, serie, points, type }) => {
  ensureConfigured();

  const level = serie ? `${classe} — Série ${serie}` : classe;
  const kind = type === 'qcm'
    ? "un QCM (question à choix multiples) : rédige uniquement l'énoncé de la question, pas les options de réponse"
    : 'une question ouverte à développement';
  const message = await callClaude({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: "Tu es un professeur qui rédige l'énoncé d'un exercice pour une plateforme scolaire en ligne. "
      + "Réponds uniquement avec l'énoncé, rédigé en français, clair et directement utilisable. "
      + "N'ajoute ni préambule, ni corrigé, ni note sur ta propre génération.",
    messages: [{
      role: 'user',
      content: `Rédige l'énoncé de ${kind}, pour la leçon « ${lessonTitle} », matière ${subject}, niveau ${level}.\n\n`
        + `Points clés à couvrir, fournis par le professeur :\n${points}`,
    }],
  });

  const text = message.content.find((b) => b.type === 'text')?.text || '';
  return text.trim();
};

const EXERCISES_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statement: { type: 'string' },
          type: { type: 'string', enum: ['open', 'qcm'] },
          options: { type: 'array', items: { type: 'string' } },
          correctOption: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        },
        required: ['statement', 'type', 'options', 'correctOption'],
        additionalProperties: false,
      },
    },
  },
  required: ['exercises'],
  additionalProperties: false,
};

// Reads an uploaded PDF (an exercise sheet) and extracts every exercise it
// contains as structured data, for the formateur to review before import.
exports.extractExercisesFromPdf = async ({ pdfBuffer, subject, classe, serie }) => {
  ensureConfigured();

  const level = serie ? `${classe} — Série ${serie}` : classe;
  const message = await callClaude({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: EXERCISES_SCHEMA } },
    system: 'Tu extrais les exercices contenus dans un document PDF pour une plateforme scolaire en ligne, '
      + `matière ${subject}, niveau ${level}. Pour chaque exercice trouvé : reproduis l'énoncé exactement `
      + "(corrige uniquement les erreurs évidentes d'extraction OCR), classe-le en \"qcm\" s'il propose des choix de "
      + 'réponse, sinon en "open". Pour un QCM, liste les options dans l\'ordre et indique correctOption (index de la '
      + "bonne réponse, en commençant à 0) uniquement si elle est identifiable dans le document — sinon mets null. "
      + "Pour une question ouverte, options doit être un tableau vide et correctOption doit être null.",
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
        { type: 'text', text: 'Extrais tous les exercices de ce document.' },
      ],
    }],
  });

  const text = message.content.find((b) => b.type === 'text')?.text || '{"exercises":[]}';
  const parsed = JSON.parse(text);
  return parsed.exercises || [];
};
