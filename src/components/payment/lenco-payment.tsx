'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadScript } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

// Sandbox vs production script URL
const LENCO_SCRIPT_URL = process.env.NEXT_PUBLIC_LENCO_ENVIRONMENT === 'sandbox'
  ? 'https://pay.sandbox.lenco.co/js/v1/inline.js'
  : 'https://pay.lenco.co/js/v1/inline.js';

interface LencoPaymentProps {
  plan: 'essential' | 'pro';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency?: 'ZMW' | 'USD';
  email: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  onSuccess: (response: { reference: string }) => void;
  onClose: () => void;
  onConfirmationPending?: () => void;
  className?: string;
  variant?: 'default' | 'gradient';
}

// Generate a unique, parseable reference: {plan}_{cycle}_{userId}_{timestamp}_{random}
function generateReference(plan: string, billingCycle: string, userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${plan}_${billingCycle}_${userId}_${timestamp}_${random}`;
}

export function LencoPayment({
  plan,
  billingCycle,
  amount,
  currency = 'USD',
  email,
  userId,
  customerName,
  customerPhone,
  onSuccess,
  onClose,
  onConfirmationPending,
  className,
  variant = 'default',
}: LencoPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  // Use ref to ensure a fresh reference is generated per click (not per render)
  const referenceRef = useRef<string>('');

  const initializePayment = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Generate a unique reference for this payment attempt
      referenceRef.current = generateReference(plan, billingCycle, userId);

      // Load Lenco script
      await loadScript(LENCO_SCRIPT_URL);
      
      // Wait for LencoPay to become available
      const maxWait = 5000;
      const start = Date.now();
      while (typeof window.LencoPay === 'undefined' && Date.now() - start < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (typeof window.LencoPay === 'undefined') {
        throw new Error('Payment service failed to load. Please check your internet connection.');
      }

      // Split name for Lenco customer object
      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      window.LencoPay.getPaid({
        key: process.env.NEXT_PUBLIC_LENCO_PUBLIC_KEY!,
        reference: referenceRef.current,
        email,
        amount,
        currency,
        channels: ['card'], // Visa/Mastercard only
        customer: {
          firstName,
          lastName,
          phone: customerPhone || '',
        },
        onSuccess: (response: any) => {
          setIsLoading(false);
          onSuccess({ reference: response.reference || referenceRef.current });
        },
        onClose: () => {
          setIsLoading(false);
          onClose();
        },
        onConfirmationPending: () => {
          setIsLoading(false);
          onConfirmationPending?.();
        },
      });

    } catch (error: any) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Payment Initialization Failed',
        description: error.message || 'Unable to start payment. Please try again.',
      });
    }
  };

  const buttonClass = variant === 'gradient'
    ? 'w-full mb-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg'
    : 'w-full mb-8 bg-primary hover:bg-primary/90 shadow-lg';

  return (
    <Button 
      onClick={initializePayment} 
      disabled={isLoading}
      className={className || buttonClass}
    >
      <CreditCard className="w-4 h-4 mr-2" />
      {isLoading ? 'Loading...' : `Subscribe — $${amount.toFixed(2)}/${billingCycle === 'yearly' ? 'mo' : 'mo'}`}
    </Button>
  );
}

// Extend Window interface for Lenco
declare global {
  interface Window {
    LencoPay?: {
      getPaid: (options: {
        key: string;
        reference: string;
        email: string;
        amount: number;
        currency: string;
        channels: string[];
        customer: {
          firstName: string;
          lastName: string;
          phone: string;
        };
        onSuccess: (response: any) => void;
        onClose: () => void;
        onConfirmationPending?: () => void;
      }) => void;
    };
  }
}
