const MIN_JWT_SECRET_LENGTH = 32;

export function validateRuntimeConfig(env = process.env) {
  const mongoUri = env.MONGO_URI || env.MONGODB_URI;
  const errors = [];

  if (!mongoUri) errors.push('MONGO_URI or MONGODB_URI is required');

  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid server configuration: ${errors.join('; ')}`);
  }

  return { mongoUri, jwtSecret: env.JWT_SECRET };
}

