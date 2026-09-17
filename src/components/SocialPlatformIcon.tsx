'use client';

import React from 'react';
import { SocialPlatform } from '@/types';
import { Globe } from 'lucide-react';

interface SocialPlatformIconProps {
  platform: SocialPlatform | string;
  className?: string;
  size?: number;
}

export const SocialPlatformIcon: React.FC<SocialPlatformIconProps> = ({
  platform,
  className = '',
  size = 20,
}) => {
  const p = (platform || '').toLowerCase();

  switch (p) {
    case 'facebook':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path
            d="M15.5 12H13V20H9.8V12H8V9.3H9.8V7.5C9.8 5.4 11 4 13.5 4C14.5 4 15.3 4.1 15.5 4.1V6.7H14.2C13.2 6.7 13 7.2 13 7.9V9.3H15.8L15.5 12Z"
            fill="white"
          />
        </svg>
      );

    case 'instagram':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <defs>
            <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFDC80" />
              <stop offset="25%" stopColor="#F77737" />
              <stop offset="50%" stopColor="#F56040" />
              <stop offset="75%" stopColor="#FD1D1D" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
          <rect
            x="4.5"
            y="4.5"
            width="15"
            height="15"
            rx="4.5"
            stroke="white"
            strokeWidth="1.8"
            fill="none"
          />
          <circle cx="12" cy="12" r="3.6" stroke="white" strokeWidth="1.8" fill="none" />
          <circle cx="16.2" cy="7.8" r="1.1" fill="white" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <rect width="24" height="24" rx="6" fill="#010101" />
          <path
            d="M15.8 4.2C16.6 5.5 17.8 6.5 19.2 6.7V9.3C18 9.3 16.8 8.8 15.9 8.1V14.3C15.9 17.1 13.6 19.3 10.8 19.3C8.4 19.3 6.4 17.5 6.1 15.1C5.8 12.3 8 9.9 10.8 9.9C11.3 9.9 11.8 10 12.2 10.2V12.9C11.8 12.7 11.3 12.6 10.8 12.6C9.5 12.6 8.5 13.6 8.5 14.9C8.5 16.2 9.5 17.2 10.8 17.2C12.1 17.2 13.2 16.1 13.2 14.8V4.2H15.8Z"
            fill="#00F2FE"
            opacity="0.85"
            transform="translate(-0.8, -0.6)"
          />
          <path
            d="M15.8 4.2C16.6 5.5 17.8 6.5 19.2 6.7V9.3C18 9.3 16.8 8.8 15.9 8.1V14.3C15.9 17.1 13.6 19.3 10.8 19.3C8.4 19.3 6.4 17.5 6.1 15.1C5.8 12.3 8 9.9 10.8 9.9C11.3 9.9 11.8 10 12.2 10.2V12.9C11.8 12.7 11.3 12.6 10.8 12.6C9.5 12.6 8.5 13.6 8.5 14.9C8.5 16.2 9.5 17.2 10.8 17.2C12.1 17.2 13.2 16.1 13.2 14.8V4.2H15.8Z"
            fill="#FE2C55"
            opacity="0.85"
            transform="translate(0.8, 0.6)"
          />
          <path
            d="M15.8 4.2C16.6 5.5 17.8 6.5 19.2 6.7V9.3C18 9.3 16.8 8.8 15.9 8.1V14.3C15.9 17.1 13.6 19.3 10.8 19.3C8.4 19.3 6.4 17.5 6.1 15.1C5.8 12.3 8 9.9 10.8 9.9C11.3 9.9 11.8 10 12.2 10.2V12.9C11.8 12.7 11.3 12.6 10.8 12.6C9.5 12.6 8.5 13.6 8.5 14.9C8.5 16.2 9.5 17.2 10.8 17.2C12.1 17.2 13.2 16.1 13.2 14.8V4.2H15.8Z"
            fill="white"
          />
        </svg>
      );

    case 'location':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="12" fill="#EA4335" />
          <path
            d="M12 4C8.7 4 6 6.7 6 10C6 14.5 12 20 12 20C12 20 18 14.5 18 10C18 6.7 15.3 4 12 4ZM12 12.2C10.8 12.2 9.8 11.2 9.8 10C9.8 8.8 10.8 7.8 12 7.8C13.2 7.8 14.2 8.8 14.2 10C14.2 11.2 13.2 12.2 12 12.2Z"
            fill="white"
          />
          <circle cx="12" cy="10" r="1.8" fill="#FEE8E6" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path
            d="M17.5 14.4C17.2 14.3 15.7 13.6 15.5 13.5C15.2 13.4 15 13.3 14.8 13.6C14.6 13.9 14.1 14.5 13.9 14.7C13.7 14.9 13.5 14.9 13.2 14.7C12.9 14.6 12 14.3 10.9 13.3C10.1 12.5 9.5 11.6 9.3 11.3C9.1 11 9.3 10.8 9.5 10.7C9.6 10.5 9.8 10.3 10 10.1C10.2 9.9 10.2 9.8 10.3 9.6C10.4 9.4 10.4 9.2 10.3 9.1C10.2 9 9.7 7.7 9.5 7.1C9.3 6.6 9.1 6.6 8.9 6.6C8.7 6.6 8.5 6.6 8.3 6.6C8.1 6.6 7.7 6.7 7.4 7C7.1 7.3 6.3 8 6.3 9.6C6.3 11.2 7.4 12.7 7.6 12.9C7.8 13.1 9.9 16.3 13.1 17.6C16.3 18.9 16.3 18.5 16.9 18.4C17.5 18.3 18.7 17.6 19 16.9C19.3 16.2 19.3 15.6 19.2 15.5C19.1 15.3 18.9 15.2 18.6 15C18.3 14.9 17.8 14.6 17.5 14.4Z"
            fill="white"
          />
        </svg>
      );

    case 'youtube':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
        >
          <rect width="24" height="24" rx="6" fill="#FF0000" />
          <path
            d="M19.6 8.4C19.4 7.6 18.8 7 18 6.8C16.6 6.5 12 6.5 12 6.5C12 6.5 7.4 6.5 6 6.8C5.2 7 4.6 7.6 4.4 8.4C4.1 9.8 4.1 12 4.1 12C4.1 12 4.1 14.2 4.4 15.6C4.6 16.4 5.2 17 6 17.2C7.4 17.5 12 17.5 12 17.5C12 17.5 16.6 17.5 18 17.2C18.8 17 19.4 16.4 19.6 15.6C19.9 14.2 19.9 12 19.9 12C19.9 12 19.9 9.8 19.6 8.4ZM10.5 14.5V9.5L14.8 12L10.5 14.5Z"
            fill="white"
          />
        </svg>
      );

    case 'custom':
    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0 ${className}`}
        >
          <Globe size={Math.round(size * 0.6)} />
        </div>
      );
  }
};
