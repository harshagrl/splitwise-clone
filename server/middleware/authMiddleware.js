const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token missing, access denied' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified) {
      return res.status(401).json({ error: 'Token verification failed, authorization denied' });
    }

    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is invalid or has expired' });
  }
};

module.exports = authMiddleware;
