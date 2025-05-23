import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  phone: z.string().refine((value) => {
    const phoneNumber = parsePhoneNumberFromString(value);
    return phoneNumber?.isValid() || false;
  }, 'Invalid phone number'),
  password: z.string().regex(
    passwordRegex,
    'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
  ),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, phone number, or username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email, phone number, or username is required')
});

export const resetPasswordSchema = z.object({
  password: z.string().regex(
    passwordRegex,
    'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
  ),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;