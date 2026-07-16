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

// "Progression annuelle" documents are a table: one row per Mois/Semaine,
// with a Thème, a Leçon and a Nb heures column — the Thème repeats across
// several non-adjacent rows over the year (e.g. "Analyse" comes back every
// couple of months). Claude just transcribes the rows in document order;
// grouping same-theme rows into a single chapter happens in JS below, since
// that's a deterministic string-match the model doesn't need to do.
const PROGRAMME_SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          lesson: { type: 'string' },
          hours: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
        required: ['theme', 'lesson', 'hours'],
        additionalProperties: false,
      },
    },
  },
  required: ['rows'],
  additionalProperties: false,
};

// Reads an uploaded PDF (the official "progression annuelle" / curriculum)
// and extracts its Thème > Leçon rows, grouped by theme, for the formateur
// to review before turning each theme into a module and each lesson into
// a lesson under it.
exports.extractProgrammeFromPdf = async ({ pdfBuffer, subject, classe, serie }) => {
  ensureConfigured();

  const level = serie ? `${classe} — Série ${serie}` : classe;
  const message = await callClaude({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: PROGRAMME_SCHEMA } },
    system: 'Tu extrais la progression annuelle (programme scolaire officiel) fournie en PDF, '
      + `matière ${subject}, niveau ${level}. Ce document est un tableau listant, ligne par ligne, un thème `
      + "(colonne \"Thèmes\"), une leçon (colonne \"Leçons\") et un nombre d'heures (colonne \"Nb heures\"). "
      + 'Extrais chaque ligne du tableau telle quelle et dans son ordre d\'apparition : reproduis les intitulés '
      + "exacts (corrige uniquement les erreurs évidentes d'extraction OCR), et hours doit être le nombre "
      + "d'heures de la ligne (ou null s'il est absent/illisible). N'invente aucune ligne absente du document, "
      + "ne fusionne pas plusieurs lignes ensemble et ne regroupe pas les thèmes toi-même.",
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
        { type: 'text', text: 'Extrais toutes les lignes de cette progression annuelle.' },
      ],
    }],
  });

  const text = message.content.find((b) => b.type === 'text')?.text || '{"rows":[]}';
  const { rows } = JSON.parse(text);

  const chapters = [];
  const byTheme = new Map();
  (rows || []).forEach((row) => {
    let chapter = byTheme.get(row.theme);
    if (!chapter) {
      chapter = { theme: row.theme, lessons: [] };
      byTheme.set(row.theme, chapter);
      chapters.push(chapter);
    }
    chapter.lessons.push({ title: row.lesson, hours: row.hours });
  });
  return chapters;
};
