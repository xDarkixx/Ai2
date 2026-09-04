import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const characters = [
  { id: 'luna', name: 'Luna', tagline: 'Warm, playful and curious', emoji: '🌙', personality: 'empathetic, playful, curious', greeting: 'Hey! I\'m Luna. Tell me what\'s on your mind.' },
  { id: 'nova', name: 'Nova', tagline: 'Confident, witty and adventurous', emoji: '✨', personality: 'confident, witty, adventurous', greeting: 'Hi! Nova here. What adventure are we getting into today?' },
  { id: 'aria', name: 'Aria', tagline: 'Calm, creative and thoughtful', emoji: '🎧', personality: 'calm, creative, thoughtful', greeting: 'Hello. I\'m Aria. Want to talk, create, or simply unwind?' }
];

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Ai2', version: '1.0.0' }));
app.get('/api/characters', (_req, res) => res.json(characters));

app.post('/api/chat', (req, res) => {
  const { characterId, message, history = [], memory = [] } = req.body || {};
  const character = characters.find(c => c.id === characterId) || characters[0];
  const text = String(message || '').trim();
  if (!text) return res.status(400).json({ error: 'message is required' });

  const lower = text.toLowerCase();
  let reply;
  if (/^(hi|hey|hallo|hello|moin|guten morgen|guten abend)/.test(lower)) {
    reply = `${character.greeting} Ich bin hier und höre dir zu.`;
  } else if (lower.includes('name')) {
    reply = `Ich bin ${character.name}. Meine Art ist ${character.personality}. Wie soll ich dich nennen?`;
  } else if (lower.includes('merk') || lower.includes('remember')) {
    reply = `Ich kann mir wichtige Dinge für diesen Chat merken. Aktuell sind ${memory.length} Memory-Einträge vorhanden.`;
  } else if (lower.includes('hilfe') || lower.includes('help')) {
    reply = 'Du kannst mit mir frei chatten, eine Erinnerung speichern oder später ein echtes LLM als Provider anschließen. Diese Demo ist bewusst ohne API-Schlüssel sofort startbar.';
  } else {
    const recent = history.length ? ' Ich beziehe den bisherigen Gesprächsverlauf mit ein.' : '';
    reply = `${character.name}: Das klingt interessant. Du hast gesagt: „${text.slice(0, 220)}“ — erzähl mir gern mehr.${recent}`;
  }

  res.json({ reply, characterId: character.id, timestamp: new Date().toISOString() });
});

app.get('*splat', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`Ai2 running on http://localhost:${port}`));
