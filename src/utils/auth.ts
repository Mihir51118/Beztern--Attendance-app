import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const SALT_ROUNDS = 12;
const OTP_LENGTH = 6;
const OTP_CHARS = '0123456789';

export const generateOTP = () => {
  const nanoid = customAlphabet(OTP_CHARS, OTP_LENGTH);
  return nanoid();
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};