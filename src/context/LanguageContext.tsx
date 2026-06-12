/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LanguageCode = 'en' | 'es' | 'fr' | 'zh';

export interface Translations {
  // Navigation & Tabs
  nav_home: string;
  nav_discover: string;
  nav_browse: string;
  nav_history: string;
  nav_settings: string;
  nav_studio: string;
  nav_tv_mode: string;
  
  // Footer Link & Copyright
  foot_terms: string;
  foot_privacy: string;
  foot_support: string;
  foot_contact: string;
  foot_copyright: string;
  
  // Footer Mobile Bar
  mob_home: string;
  mob_discover: string;
  mob_browse: string;
  mob_tickets: string;
  mob_profile: string;

  // General Buttons/Labels
  btn_support_center: string;
  btn_accept_terms: string;
  btn_upgrade: string;
  btn_sign_out: string;
  btn_sign_in: string;
  search_placeholder: string;
}

export const translationDict: Record<LanguageCode, Translations> = {
  en: {
    nav_home: 'Home',
    nav_discover: 'Discover ⭐',
    nav_browse: 'Browse',
    nav_history: 'History',
    nav_settings: 'Settings 🛡️',
    nav_studio: 'Studio',
    nav_tv_mode: '📺 TV MODE',
    foot_terms: 'Terms',
    foot_privacy: 'Privacy',
    foot_support: 'Support',
    foot_contact: 'Contact',
    foot_copyright: '© 2026 ROWONE. ALL SEATS RESERVED.',
    mob_home: 'Home',
    mob_discover: 'Discover',
    mob_browse: 'Browse',
    mob_tickets: 'My Tickets',
    mob_profile: 'Profile',
    btn_support_center: 'Support Center',
    btn_accept_terms: 'I Accept terms',
    btn_upgrade: 'ROWONE Pass Premium',
    btn_sign_out: 'Sign Out',
    btn_sign_in: 'Sign In',
    search_placeholder: 'Search movies...',
  },
  es: {
    nav_home: 'Inicio',
    nav_discover: 'Descubrir ⭐',
    nav_browse: 'Explorar',
    nav_history: 'Historial',
    nav_settings: 'Ajustes 🛡️',
    nav_studio: 'Estudio',
    nav_tv_mode: '📺 MODO TV',
    foot_terms: 'Condiciones',
    foot_privacy: 'Privacidad',
    foot_support: 'Soporte',
    foot_contact: 'Contacto',
    foot_copyright: '© 2026 ROWONE. TODOS LOS ASIENTOS RESERVADOS.',
    mob_home: 'Inicio',
    mob_discover: 'Descubrir',
    mob_browse: 'Explorar',
    mob_tickets: 'Mis Boletos',
    mob_profile: 'Perfil',
    btn_support_center: 'Centro de Soporte',
    btn_accept_terms: 'Acepto las condiciones',
    btn_upgrade: 'Pase ROWONE Premium',
    btn_sign_out: 'Cerrar sesión',
    btn_sign_in: 'Iniciar sesión',
    search_placeholder: 'Buscar películas...',
  },
  fr: {
    nav_home: 'Accueil',
    nav_discover: 'Découvrir ⭐',
    nav_browse: 'Parcourir',
    nav_history: 'Historique',
    nav_settings: 'Paramètres 🛡️',
    nav_studio: 'Studio',
    nav_tv_mode: '📺 MODE TV',
    foot_terms: 'Conditions',
    foot_privacy: 'Confidentialité',
    foot_support: 'Assistance',
    foot_contact: 'Contact',
    foot_copyright: '© 2026 ROWONE. TOUS LES SIÈGES RÉSERVÉS.',
    mob_home: 'Accueil',
    mob_discover: 'Découvrir',
    mob_browse: 'Parcourir',
    mob_tickets: 'Mes Billets',
    mob_profile: 'Profil',
    btn_support_center: 'Centre d\'Assistance',
    btn_accept_terms: 'J\'accepte les conditions',
    btn_upgrade: 'Pass ROWONE Premium',
    btn_sign_out: 'Déconnexion',
    btn_sign_in: 'Se connecter',
    search_placeholder: 'Rechercher des films...',
  },
  zh: {
    nav_home: '首页',
    nav_discover: '发现 ⭐',
    nav_browse: '浏览',
    nav_history: '历史纪录',
    nav_settings: '系统设置 🛡️',
    nav_studio: '工作室',
    nav_tv_mode: '📺 电视模式',
    foot_terms: '服务条款',
    foot_privacy: '隐私政策',
    foot_support: '客户支持',
    foot_contact: '联系我们',
    foot_copyright: '© 2026 ROWONE. 保留所有席位。',
    mob_home: '首页',
    mob_discover: '发现',
    mob_browse: '浏览',
    mob_tickets: '我的电影票',
    mob_profile: '个人资料',
    btn_support_center: '支持中心',
    btn_accept_terms: '我同意条款',
    btn_upgrade: 'ROWONE 尊享通道',
    btn_sign_out: '退出登录',
    btn_sign_in: '用户登录',
    search_placeholder: '搜索电影...',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof Translations | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const stored = localStorage.getItem('popcorn_app_language');
      if (stored === 'en' || stored === 'es' || stored === 'fr' || stored === 'zh') {
        return stored;
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('popcorn_app_language', lang);
    } catch {}
  };

  const t = (key: keyof Translations | string): string => {
    const dict = translationDict[language];
    if (key in dict) {
      return dict[key as keyof Translations];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
