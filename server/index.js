import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Placeholder chat endpoint (replace with real provider)
app.post('/api/chat', async (req, res) => {
  const { messages = [] } = req.body || {};
  const userMsg = messages.findLast?.(m => m.role === 'user') || messages[messages.length - 1];
  const text = userMsg?.content || '';
  // Simple echo placeholder until we connect a real model
  const reply = text?.trim()
    ? 'Сервер ответ: принял сообщение, интеграция с ИИ будет подключена.'
    : 'Сервер готов. Отправь сообщение.';
  res.json({ role: 'assistant', content: reply });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`oni-ai-api listening on :${port}`));
