import { Worker } from "bullmq";
import { redis } from "../shared/redis";
import { prisma } from "../shared/db";

// Syncs inventory changes to the warehouse management system
const worker = new Worker("inventory-sync", async (job) => {
  const { productId, quantity } = job.data;
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { quantity } });
    await tx.auditLog.create({ data: { action: "SYNC", productId, quantity } });
  });
}, { connection: redis });

export { worker };
