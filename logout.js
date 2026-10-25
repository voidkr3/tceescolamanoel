export default async (req, res) => {
  res.setHeader('Set-Cookie', 'tce=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ok:true});
};
