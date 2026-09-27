'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useMenuStore } from '@/lib/menuStore';
import { restaurantInfo } from '@/data/mockData';
import { getWhatsAppMeLink } from '@/lib/whatsapp';
import { getTelHref } from '@/lib/contactLinks';
import { SocialPlatformIcon } from '@/components/SocialPlatformIcon';
import { sounds } from '@/lib/sound';
import type { RestaurantSocialLink } from '@/types';

interface FloatingContactButtonProps {
  isTourOpen?: boolean;
}

export const FloatingContactButton: React.FC<FloatingContactButtonProps> = ({
  isTourOpen = false,
}) => {
  const { getItemsCount, isCartOpen } = useCartStore();
  const socialLinks = useMenuStore((state) => state.socialLinks);
  const ordersWhatsappNumber = useMenuStore((state) => state.ordersWhatsappNumber);
  const restaurantPhoneNumber = useMenuStore((state) => state.restaurantPhoneNumber);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPinned) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setIsPinned(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isPinned]);

  const contacts = useMemo(() => {
    const enabled = (socialLinks || []).filter((link) => link.isEnabled && link.url);
    const hasWhatsApp = enabled.some((link) => link.platform === 'whatsapp');
    const items: RestaurantSocialLink[] = [...enabled];

    if (!hasWhatsApp) {
      const phone = (ordersWhatsappNumber || restaurantInfo.whatsapp || '').trim();
      if (phone) {
        items.unshift({
          id: 'contact-whatsapp',
          title: 'واتساب',
          platform: 'whatsapp',
          url: getWhatsAppMeLink(phone),
          isEnabled: true,
        });
      }
    }

    const hasPhone = items.some((link) => link.platform === 'custom' && link.url.startsWith('tel:'));
    const tel = (restaurantPhoneNumber || restaurantInfo.phone || '').trim();
    if (!hasPhone && tel) {
      items.push({
        id: 'contact-phone',
        title: 'اتصال',
        platform: 'custom',
        url: getTelHref(tel),
        isEnabled: true,
      });
    }

    return items;
  }, [socialLinks, ordersWhatsappNumber, restaurantPhoneNumber]);

  if (!mounted || isCartOpen || isTourOpen || contacts.length === 0) return null;

  const count = getItemsCount();
  const hasCartBar = count > 0;
  const isOpen = isHovered || isPinned;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    sounds.playAddChime();
    setIsPinned((prev) => !prev);
  };

  return (
    <div
      ref={rootRef}
      style={{
        transition: 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`fixed ${
        hasCartBar ? 'bottom-28 sm:bottom-30' : 'bottom-6 sm:bottom-8'
      } left-4 sm:left-6 z-40 pointer-events-auto select-none`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`luxury-fab-wrap luxury-fab-wrap-alt ${isOpen ? 'is-open' : ''}`}>
        {contacts.map((link, index) => {
          const offset = (index + 1) * 60;
          const isPhone = link.id === 'contact-phone';
          return (
            <a
              key={link.id}
              href={link.url}
              target={link.url.startsWith('tel:') ? undefined : '_blank'}
              rel={link.url.startsWith('tel:') ? undefined : 'noopener noreferrer'}
              title={link.title}
              aria-label={link.title}
              style={{
                transform: isOpen ? `translateY(-${offset}px)` : 'translateY(0) scale(0.55)',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transitionDelay: isOpen ? `${index * 40}ms` : `${(contacts.length - index) * 20}ms`,
              }}
              className="absolute inset-0 z-20 rounded-full bg-[#fff8f0] border border-[#f5d48a]/80 shadow-[0_8px_22px_rgba(84,25,17,0.28)] flex items-center justify-center overflow-hidden transition-all duration-300 ease-out hover:scale-110"
            >
              {isPhone ? (
                <span className="flex items-center justify-center w-full h-full rounded-full bg-gradient-to-tr from-[#7a1a22] to-[#c43b3a] text-[#f8e6b0]">
                  <Phone className="w-5 h-5" />
                </span>
              ) : (
                <SocialPlatformIcon platform={link.platform} size={42} />
              )}
            </a>
          );
        })}

        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label="قنوات التواصل"
          className="luxury-fab luxury-fab-ruby relative z-10 transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <span className="luxury-fab-sheen" />
          <span className="luxury-fab-icon">
            <MessageCircle className="text-[#f8e6b0] fill-[#f5d48a]/35" strokeWidth={2} />
          </span>
        </button>
      </div>
    </div>
  );
};
