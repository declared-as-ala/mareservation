// Re-export from middlewares for backward compatibility
export { authenticate, requireAdmin, requireRoles, requireEstablishmentOwner, requireAnyServiceDomains, type AuthRequest } from '../middlewares/auth.middleware';
