import { authService } from '../services/authService.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        fullName: decoded.name,
        globalRole: decoded.globalRole,
        orgId: decoded.orgId,
        orgRole: decoded.orgRole,
      };
    }
  }

  // Tenant identity handling:
  // If user is authenticated with an organization, lock strictly to their authenticated orgId.
  // Authenticated organization access cannot be overridden by client-supplied x-org-id header.
  // Platform admins may optionally supply x-org-id to inspect specific tenants.
  // Unauthenticated requests or users without an organization must receive null (never default to demoOrgId).
  if (req.user?.orgId) {
    req.orgId = req.user.orgId;
  } else if (req.user?.globalRole === 'platform_admin') {
    req.orgId = req.headers['x-org-id'] || null;
  } else {
    req.orgId = null;
  }

  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.orgRole || req.user.globalRole;
    if (userRole === 'platform_admin' || allowedRoles.includes(userRole) || allowedRoles.includes(req.user.globalRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Role '${userRole}' does not have sufficient permissions. Required: ${allowedRoles.join(', ')}`
    });
  };
}
