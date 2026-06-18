import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { FeaturesSection } from '../components/FeatureSection';
import { CustomizeSection } from '../components/CustomiseSection';
import { AISection } from '../components/AIsection';
import { FAQSection } from '../components/FAQSection';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';
import { LeadModal } from '../components/LeadModal';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUseCase, setModalUseCase] = useState('General Inquiry');
  const [modalMode, setModalMode] = useState('sales');

  const openModal = (mode = 'sales', useCase = 'General Inquiry') => {
    setModalMode(mode);
    setModalUseCase(useCase);
    setIsModalOpen(true);
  };

  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <div className="zoho-font-sans bg-white min-h-screen text-[#0F172A] antialiased selection:bg-blue-500 selection:text-white">
      <Navbar
        onSignIn={() => navigate('/login')}
        onRequestDemo={() => openModal('demo', 'Navbar Demo Request')}
        onAccessProjects={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
      />

      <main className="pt-16">
        <Hero
          onAccessWorkspace={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
          onRequestDemo={(mode, useCase) => openModal(mode || 'demo', useCase || 'Hero Request')}
        />

        <FeaturesSection
          onRequestDemo={(mode, useCase) => openModal(mode || 'demo', useCase || 'Features Request')}
        />

        <CustomizeSection
          onRequestDemo={(mode, useCase) => openModal(mode || 'sales', useCase || 'Customization Request')}
        />

        <AISection
          onRequestDemo={(useCase) => openModal('demo', useCase || 'AI Request')}
        />

        <FAQSection />

        <CTASection
          onAccessProjects={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
        />
      </main>

      <Footer
        onRequestDemo={(mode, useCase) => openModal(mode || 'sales', useCase || 'Footer Request')}
      />

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialUseCase={modalUseCase}
        mode={modalMode}
      />
    </div>
  );
};

export default LandingPage;
