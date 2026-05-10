export const getLinkStatsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>, 
  reply: FastifyReply
) => {
  const { id } = request.params;
  const user = request.user;

  // Security check: Only the owner sees stats
  const link = await prisma.link.findUnique({ 
    where: { id },
    include: {
      analytics: true
    }
  });

  if (!link || link.userId !== user.id) {
    return reply.status(404).send({ error: 'Link not found' });
  }

  // Aggregate Data for the Frontend
  const countries = await prisma.analytics.groupBy({
    by: ['country'],
    where: { linkId: id },
    _count: { country: true },
  });

  const devices = await prisma.analytics.groupBy({
    by: ['device'],
    where: { linkId: id },
    _count: { device: true },
  });

  return reply.send({
    totalClicks: link.clicks,
    countries,
    devices,
    recentActivity: link.analytics.slice(-10), // Last 10 clicks
  });
};