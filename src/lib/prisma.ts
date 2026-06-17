// lib/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Determine log level based on environment
const logLevel: ('query' | 'info' | 'warn' | 'error')[] = process.env.NODE_ENV === 'production' 
  ? ['error']
  : ['query', 'error', 'warn'];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration for concurrent users
    // Prisma automatically manages connection pooling
    // The default pool size should handle 10+ concurrent connections
  });

// Graceful shutdown handler
if (typeof window === 'undefined') {
  const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to execute with retry logic for transient errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable (connection issues, deadlocks, etc.)
      const isRetryable = 
        error.code === 'P2024' || // Timed out fetching a new connection
        error.code === 'P2034' || // Transaction conflicts
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P1002' || // Database server timeout
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('deadlock');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Retrying database operation (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }
  
  throw lastError;
}
