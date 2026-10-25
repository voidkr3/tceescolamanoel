import { neon } from '@neondatabase/serverless';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const sign = async (k, d) => b64(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(k), {name:'HMAC',hash:'SHA-256'}, false, ['sign']), enc.encode(d)));
const P = ['principal'], C = ['principal','secundaria'], A = [...C,'voluntario'];
const T = {
  requests:{r:[...C,'escola'],w:[...C,'escola'],e:C,f:['title','requester','objective','event_date','support_type','details','status','area','notes']},
  tasks:{r:A,w:C,f:['title','description','area','assignee_id','due_date','status']},
  minutes:{r:C,w:C,f:['title','meeting_date','participants','decisions','pending']},
  notices:{r:[...A,'escola'],w:C,f:['title','body']},
  events:{r:A,w:C,f:['title','event_date','place','responsible','status','objective','results','difficulties','lessons','attendance','checklist']},
  incidents:{r:A,w:A,e:C,f:['title','description','level','status','measures']},
  candidates:{r:C,w:C,f:['name','grade','area','s1','s2','s3','s4','s5','s6','decision','notes']},
  users:{r:C,w:P,f:['name','email','role','area','active']},
};
const CO = {requests:['area','status','notes'], incidents:['level','status','measures']};
const OWN = {requests:['escola','created_by'], incidents:['voluntario','reporter_id']};

export default async (req, res) => {
  const sql = neon(process.env.DATABASE_URL);
  const route = req.query.route || [];
  const [res_name, id] = route;
  const m = req.method;
  const body = ['POST','PATCH'].includes(m) ? req.body || {} : {};
  try {
    // autenticação
    const tk = (req.headers.cookie||'').match(/tce=([^;]+)/)?.[1] || '';
    const [pl, sg] = tk.split('.');
    if (!pl || sg !== await sign(process.env.JWT_SECRET, pl)) return res.status(401).json({error:'Não autenticado'});
    const claim = JSON.parse(dec.decode(unb64(pl)));
    if (claim.exp < Date.now()) return res.status(401).json({error:'Sessão expirada'});
    const u_res = await sql.query('SELECT id,name,email,role,area,terms_at FROM users WHERE id=$1 AND active', [claim.id]);
    if (!u_res.rows.length) return res.status(401).json({error:'Acesso desativado'});
    const u = u_res.rows[0];

    if (res_name === 'me') return res.json(u);
    if (res_name === 'terms' && m === 'POST') {
      await sql.query('UPDATE users SET terms_at=now() WHERE id=$1', [u.id]);
      return res.json({ok:true});
    }
    if (res_name === 'dashboard') {
      const mine = u.role === 'voluntario';
      const tasks_res = await sql.query(`SELECT status,count(*)::int n FROM tasks ${mine?'WHERE assignee_id=$1':''} GROUP BY status`, mine?[u.id]:[]);
      const out = {tasks: tasks_res.rows};
      if (!C.includes(u.role)) {
        out.pending = (await sql.query("SELECT count(*)::int n FROM requests WHERE status='pendente'")).rows[0].n;
        out.members = (await sql.query('SELECT count(*)::int n FROM users WHERE active')).rows[0].n;
        out.open = (await sql.query("SELECT count(*)::int n FROM incidents WHERE status<>'resolvida'")).rows[0].n;
      }
      return res.json(out);
    }
    const t = T[res_name];
    if (!t) return res.status(404).json({error:'Não encontrado'});
    const need = (list) => list.includes(u.role) ? null : res.status(403).json({error:'Sem permissão'});

    if (m === 'GET') {
      const d = need(t.r); if (d) return;
      const vol = res_name === 'tasks' && u.role === 'voluntario';
      const ow = OWN[res_name]?.[0] === u.role ? OWN[res_name][1] : null;
      const sqlText = res_name === 'users' ? 'SELECT id,name,email,role,area,active FROM users ORDER BY name'
                    : res_name === 'tasks' ? 'SELECT t.*,u.name assignee FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id' + (vol ? ' WHERE t.assignee_id=$1' : '') + ' ORDER BY t.due_date NULLS LAST'
                    : `SELECT * FROM ${res_name}${ow ? ` WHERE ${ow}=$1` : ''} ORDER BY id DESC`;
      const rows_res = await sql.query(sqlText, vol || ow ? [u.id] : []);
      return res.json(rows_res.rows);
    }
    if (m === 'PATCH' && res_name === 'tasks' && u.role === 'voluntario') {
      const r = await sql.query('UPDATE tasks SET status=$1 WHERE id=$2 AND assignee_id=$3 RETURNING id', [body.status, id, u.id]);
      return r.rows.length ? res.json({ok:true}) : res.status(403).json({error:'Sem permissão'});
    }
    if (m === 'PATCH' && res_name === 'events' && u.role === 'voluntario') {
      await sql.query('UPDATE events SET checklist=$1::jsonb WHERE id=$2', [body.checklist, id]);
      return res.json({ok:true});
    }
    const d = need(m === 'DELETE' ? P : m === 'POST' ? t.w : (t.e || t.w)); if (d) return;
    const data = {};
    for (const f of t.f) if (f in body) data[f] = body[f] === '' ? null : body[f];
    if (!C.includes(u.role)) for (const f of CO[res_name] || []) delete data[f];
    if (m === 'POST' && OWN[res_name]) data[OWN[res_name][1]] = u.id;
    if (res_name === 'users') {
      if (data.email) data.email = data.email.toLowerCase();
      if (body.password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const k = await crypto.subtle.importKey('raw', enc.encode(body.password), 'PBKDF2', false, ['deriveBits']);
        data.pass = b64(salt) + '.' + b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000}, k, 256));
      }
      if (id == u.id && (data.role && data.role !== u.role || data.active === false)) 
        return res.status(400).json({error:'Você não pode alterar o próprio papel ou desativar a si mesmo'});
    }
    const cols = Object.keys(data);
    if (m === 'POST') {
      if (res_name === 'users' && !data.pass) return res.status(400).json({error:'Informe uma senha'});
      const r = await sql.query(`INSERT INTO ${res_name}(${cols.join(',')}) VALUES(${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id`, cols.map(c => data[c]));
      return res.json(r.rows[0], 201);
    }
    if (m === 'PATCH') {
      await sql.query(`UPDATE ${res_name} SET ${cols.map((c,i)=>`${c}=$${i+1}`).join(',')} WHERE id=$${cols.length+1}`, [...cols.map(c => data[c]), id]);
      return res.json({ok:true});
    }
    if (m === 'DELETE') {
      await sql.query(`DELETE FROM ${res_name} WHERE id=$1`, [id]);
      return res.json({ok:true});
    }
    res.status(405).json({error:'Método não suportado'});
  } catch (e) {
    console.error(e);
    res.status(400).json({error: String(e.message).includes('unique') ? 'E-mail já cadastrado' : e.message});
  }
};
