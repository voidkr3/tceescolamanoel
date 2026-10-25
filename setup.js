import { neon } from '@neondatabase/serverless';
const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash = async (pw, salt = crypto.getRandomValues(new Uint8Array(16))) => {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(salt) + '.' + b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000}, k, 256));
};
export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  const { key, name, email, password } = req.body;
  if (!process.env.SETUP_KEY || key !== process.env.SETUP_KEY) return res.status(403).json({error:'Chave inválida'});
  try {
    const sql = neon(process.env.DATABASE_URL);
    const u = await sql.query('SELECT 1 FROM users LIMIT 1');
    if (u.rows.length) return res.status(409).json({error:'Sistema já configurado'});
    await sql.query("INSERT INTO users(name,email,pass,role) VALUES($1,$2,$3,'principal')", 
      [name, email.toLowerCase(), await hash(password)]);
    res.json({ok:true});
  } catch (e) {
    res.status(400).json({error:e.message});
  }
};
