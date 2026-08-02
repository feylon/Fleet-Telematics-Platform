import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

const argonOptions: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, argonOptions);

export const verifyPassword = async (hash: string, plain: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
};

export const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');
