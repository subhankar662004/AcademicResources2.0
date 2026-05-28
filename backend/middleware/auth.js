import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-secret-key';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'null') return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'null') return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyTeacher = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'null') return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!['teacher', 'admin'].includes(decoded.role)) return res.status(403).json({ message: 'Teacher access required' });
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
