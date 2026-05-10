import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../config/prisma';
import { nanoid } from 'nanoid';
import { fetchMetadata } from '../utils/metadata';
import { generateQRCode } from '../utils/qrcode';

export const createLinkHandler = async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
  const { originalUrl, customSlug, password, expiresAt } = request.body;
  const user = request.user;

  // Pro validation for Custom Slugs
  if (customSlug && !user.isPro) {
    return reply.status(403).send({ error: 'Upgrade to Pro for custom slugs' });
  }

  const slug = customSlug || nanoid(6);
  
  // Fetch Metadata & QR in parallel to save time
  const [metadata, qrCode] = await Promise.all([
    fetchMetadata(originalUrl),
    generateQRCode(slug)
  ]);

  const link = await prisma.link.create({
    data: {
      originalUrl,
      slug,
      ...metadata,
      password: user.isPro ? password : null, // Only save password if Pro
      expiresAt: user.isPro && expiresAt ? new Date(expiresAt) : null,
      userId: user.id,
      customSlug: !!customSlug
    }
  });

  return reply.send({
    message: 'Link created',
    shortUrl: `http://localhost:5000/${link.slug}`,
    qrCode, // Send the QR string directly to the frontend
    data: link
  });
};