import { neon } from '@neondatabase/serverless';
const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sign = async (k, d) => b64(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(k), {name:'HMAC',hash:'SHA-256'}, false, ['sign']), enc.encode(d)));
const verify = async (pw, st) => {
  const [s, h] = st.split('.');
  const salt = Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000}, k, 256);
  return b64(bits) === h;
};
export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  const { email, password } = req.body;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const u = await sql.query('SELECT * FROM users WHERE email=$1 AND active', [String(email||'').toLowerCase()]);
    if (!u.rows.length || !(await verify(String(password||''), u.rows[0].pass))) 
      return res.status(401).json({error:'E-mail ou senha incorretos'});
    const claim = JSON.stringify({id:u.rows[0].id, exp:Date.now()+8*3600e3});
    const p = b64(enc.encode(claim));
    const sg = await sign(process.env.JWT_SECRET, p);
    res.setHeader('Set-Cookie', `tce=${p}.${sg}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);
    res.json({ok:true});
  } catch (e) {
    res.status(400).json({error:e.message});
  }
};
