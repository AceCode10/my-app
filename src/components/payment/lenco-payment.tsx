'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadScript } from '@/lib/utils';

interface LencoPaymentProps {
  amount: number;
  currency?: 'ZMW' | 'USD';
  email: string;
  customerName: string;
  customerPhone?: string;
  reference: string;
  onSuccess: (response: any) => void;
  onClose: () => void;
  onConfirmationPending?: () => void;
}

export function LencoPayment({
  amount,
  currency = 'USD',
  email,
  customerName,
  customerPhone,
  reference,
  onSuccess,
  onClose,
  onConfirmationPending,
}: LencoPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initializePayment = async () => {
    setIsLoading(true);

    try {
      // Load Lenco script if not already loaded
      await loadScript('https://pay.lenco.co/js/v1/inline.js');
      
      // Wait for script to be available
      const maxWaitTime = 5000; // 5 seconds
      const startTime = Date.now();
      
      while (typeof window.LencoPay === 'undefined' && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (typeof window.LencoPay === 'undefined') {
        throw new Error('Lenco payment script failed to load');
      }

      // Split customer name into first and last name
      const nameParts = customerName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Initialize Lenco payment
      window.LencoPay.getPaid({
        key: process.env.NEXT_PUBLIC_LENCO_PUBLIC_KEY,
        reference,
        email,
        amount,
        currency,
        channels: ['card'], // Only accept card payments as per your requirement
        customer: {
          firstName,
          lastName,
          phone: customerPhone || '',
        },
        onSuccess: (response: any) => {
          setIsLoading(false);
          onSuccess(response);
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

  return (
    <Button 
      onClick={initializePayment} 
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Initializing Payment...' : `Pay $${amount.toFixed(2)}`}
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
