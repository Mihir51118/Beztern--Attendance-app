import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TimerReset as KeyReset, ArrowLeft, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../lib/validation';
import { requestPasswordReset } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setLoading(true);
    try {
      await requestPasswordReset(data.identifier);
      setSubmitted(true);
      showToast('Reset instructions sent! Check your email/phone.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send reset instructions', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fadeIn">
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-3">
            <KeyReset className="h-12 w-12 text-blue-900" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-white">Reset Password</h1>
        <h2 className="mt-2 text-center text-xl text-blue-200">Get back into your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-slideUp">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {submitted ? (
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-4">Check your inbox</h3>
              <p className="text-gray-600 mb-6">
                We've sent instructions to reset your password. Please check your email or phone for the reset code.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-blue-900 hover:text-blue-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="form-group">
                <label htmlFor="identifier" className="form-label">Email or Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('identifier')}
                    type="text"
                    className={`input-field pl-10 ${errors.identifier ? 'border-red-500' : ''}`}
                    placeholder="Enter your email or phone number"
                  />
                </div>
                {errors.identifier && (
                  <p className="error-message">{errors.identifier.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary flex justify-center items-center space-x-2"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending Instructions...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <KeyReset className="h-5 w-5" />
                    <span>Send Reset Instructions</span>
                  </span>
                )}
              </button>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/login"
                  className="flex items-center text-sm font-medium text-blue-900 hover:text-blue-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;