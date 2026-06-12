/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Compass, Ticket, Bell, User, Sparkles, Globe } from 'lucide-react';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import RowOneLogo from './RowOneLogo';

interface FooterProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onTriggerSupport?: () => void;
  onTriggerPrivacy?: (tab: 'privacy' | 'terms') => void;
}

export default function Footer({ currentTab, setCurrentTab, onTriggerSupport, onTriggerPrivacy }: FooterProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      {/* Desktop Footer */}
      <footer className="w-full mt-24 py-8 px-6 md:px-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6 bg-surface-container-lowest z-10 relative">
        <div className="flex flex-col items-center md:items-start gap-2.5 text-center md:text-left">
          <div className="flex items-center gap-2">
            <RowOneLogo size={24} />
            <span className="font-display text-[#ebd6aa] font-black text-lg italic tracking-tighter uppercase">
              ROWONE
            </span>
          </div>
          <p className="font-sans text-xs text-on-surface-variant opacity-70 mt-1">
            {t('foot_copyright')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Custom Language Dropper inline */}
          <div className="flex items-center gap-2 bg-[#121214] border border-white/5 hover:border-[#ff1a40]/30 px-3 py-1.5 rounded-full select-none transition-colors duration-300">
            <Globe className="h-3.5 w-3.5 text-[#ff1a40]" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-[10px] text-white/90 border-none focus:outline-none focus:ring-0 cursor-pointer font-sans font-black uppercase tracking-widest outline-none pr-1"
            >
              <option value="en" className="bg-[#121214] text-white">English (EN)</option>
              <option value="es" className="bg-[#121214] text-white">Español (ES)</option>
              <option value="fr" className="bg-[#121214] text-white">Français (FR)</option>
              <option value="zh" className="bg-[#121214] text-white">简体中文 (ZH)</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-8 justify-center">
            {[
              { key: t('foot_terms'), action: 'Terms' },
              { key: t('foot_privacy'), action: 'Privacy' },
              { key: t('foot_support'), action: 'Support' },
              { key: t('foot_contact'), action: 'Contact' }
            ].map(({ key, action }) => (
              <a
                key={action}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if ((action === 'Support' || action === 'Contact') && onTriggerSupport) {
                    onTriggerSupport();
                  } else if (action === 'Privacy' && onTriggerPrivacy) {
                    onTriggerPrivacy('privacy');
                  } else if (action === 'Terms' && onTriggerPrivacy) {
                    onTriggerPrivacy('terms');
                  }
                }}
                className="font-sans text-xs text-on-tertiary-container hover:text-[#ff1a40] transition-colors duration-300"
              >
                {key}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1.5 py-2.5 bg-surface-container-highest/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] rounded-t-2xl">
        {[
          { id: 'home', label: t('mob_home'), icon: Home },
          { id: 'discover', label: t('mob_discover'), icon: Sparkles },
          { id: 'browse', label: t('mob_browse'), icon: Compass },
          { id: 'history', label: t('mob_tickets'), icon: Ticket },
          { id: 'settings', label: t('mob_profile'), icon: User },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-300 active:scale-95 flex-1 relative ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:text-primary-fixed'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="font-sans text-[8.5px] uppercase font-bold tracking-widest mt-1 scale-90">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
