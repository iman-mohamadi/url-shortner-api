import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { captureAnalytics } from '../utils/analytics';

export const redirectHandler = async (request: FastifyRequest<{ Params: { slug: string }; Querystring: { pw?: string } }>, reply: FastifyReply) => {
  const { slug } = request.params;
  const { pw } = request.query; // Optional password from query string

  const link = await prisma.link.findUnique({ where: { slug } });

  if (!link) return reply.status(404).send({ error: 'Link not found' });

  // 1. Check Expiration (Pro Feature)
  if (link.expiresAt && new Date() > link.expiresAt) {
    return reply.status(410).send({ error: 'This link has expired' });
  }

  // 2. Check Password (Pro Feature)
  if (link.password) {
    // If no password provided or it doesn't match
    if (!pw || pw !== link.password) {
      // We return a specific code so the Frontend knows to show the Password Modal
      return reply.status(403).send({ 
        message: 'Protected link', 
        isProtected: true,
        title: link.title,
        favicon: link.favicon 
      });
    }
  }

  // 3. High-Speed Redirect with Analytics
  captureAnalytics(request, link.id).catch(console.error);
  
  prisma.link.update({ 
    where: { id: link.id }, 
    data: { clicks: { increment: 1 } } 
  }).catch(console.error);

  return reply.redirect(link.originalUrl);
};