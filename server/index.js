import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Supabase server client (service role or anon key with RLS policies)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // recommended
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Extract user from Authorization: Bearer <access_token> (Supabase auth token from client)
async function getUser(req) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Threads CRUD (minimal)
app.get('/api/threads', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/threads', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title = 'New chat' } = req.body || {};
  const { data, error } = await supabase
    .from('threads')
    .insert({ user_id: user.id, title })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/threads/:id', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id;
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Messages
app.get('/api/threads/:id/messages', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const threadId = req.params.id;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/threads/:id/messages', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const threadId = req.params.id;
  // Ensure ownership of thread
  const { data: tCheck, error: tErr } = await supabase.from('threads').select('id,user_id').eq('id', threadId).single();
  if (tErr) return res.status(404).json({ error: 'Thread not found' });
  if (tCheck.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const { role, content } = req.body || {};
  if (!role || !content) return res.status(400).json({ error: 'role and content required' });
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, role, content })
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  // bump thread updated_at
  await supabase.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  res.json(data);
});

// Chat with model (Groq API, OpenAI-compatible schema)
app.post('/api/chat', async (req, res) => {
  try{
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if(!GROQ_API_KEY){
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    }
    let { messages = [], temperature = 0.7, max_tokens = 768, systemPrompt } = req.body || {};
    // System prompt: take from client if provided, else fallback default; clamp length
    const sysContent = (typeof systemPrompt === 'string' && systemPrompt.trim())
      ? String(systemPrompt).slice(0, 4000)
      : 'You are OniAI, a helpful assistant. Keep answers concise and useful.';
    const sys = { role: 'system', content: sysContent };
    // Trim long histories
    const MAX_TOK_MESSAGES = 12;
    if(messages.length > MAX_TOK_MESSAGES){ messages = messages.slice(-MAX_TOK_MESSAGES); }
    const payload = {
      model: GROQ_MODEL,
      messages: [sys, ...messages.map(m=>({ role: m.role, content: String(m.content||'').slice(0,4000) }))],
      temperature,
      max_tokens,
    };
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify(payload)
    });
    if(!r.ok){
      const errText = await r.text();
      return res.status(502).json({ error:'Groq error', detail: errText });
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || 'Готов помочь.';
    res.json({ role:'assistant', content });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'chat_failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`oni-ai-api listening on :${port}`));
