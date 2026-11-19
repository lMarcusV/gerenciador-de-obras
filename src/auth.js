const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');
const { Usuario } = require('./db');

function gerarToken(usuario) {
  return jwt.sign({ sub: usuario.id }, JWT_SECRET, { expiresIn: '8h' });
}

// Exige "Authorization: Bearer <token>" e carrega o usuário em req.usuario.
async function autenticar(req, res, next) {
  try {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({ mensagem: 'Autenticação necessária.' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(payload.sub);
    if (!usuario) return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    req.usuario = usuario;
    next();
  } catch (e) {
    res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }
}

module.exports = { gerarToken, autenticar };
