import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { verifyOTP } from '../services/authService';

const VerifyPage: React.FC = () => {
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify both email and phone OTPs
      await Promise.all([
        verifyOTP(emailCode, 'email'),
        verifyOTP(phoneCode, 'phone')
      ]);

      showToast('Verification successful!', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fadeIn">
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-3">
            <Shield className="h-12 w-12 text-blue-900" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-white">Verify Account</h1>
        <h2 className="mt-2 text-center text-xl text-blue-200">Enter verification codes</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-slideUp">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <form onSubmit={handleVerification} className="space-y-6">
            <div className="form-group">
              <label htmlFor="emailCode" className="form-label">Email Verification Code</label>
              <input
                type="text"
                id="emailCode"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                className="input-field"
                placeholder="Enter email verification code"
                maxLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneCode" className="form-label">Phone Verification Code</label>
              <input
                type="text"
                id="phoneCode"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="input-field"
                placeholder="Enter phone verification code"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !emailCode || !phoneCode}
              className="w-full btn btn-primary flex justify-center items-center space-x-2"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5" />
                  <span>Complete Verification</span>
                </span>
              )}
            </button>

            <p className="mt-4 text-sm text-gray-600 text-center">
              Didn't receive the codes? Check your spam folder or contact support.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;