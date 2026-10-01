import React, { useState, useRef } from 'react';
import type { UserProfile, RecommendationResponse } from './types/api';
import { getRecommendations, ClientApiError } from './api/client';
import { Header } from './components/Header';
import { ProfileForm } from './components/ProfileForm';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { RecommendationList } from './components/RecommendationList';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';

// Build-time conditional mock gating
const isMock = import.meta.env.VITE_USE_MOCK === 'true';
const MockControls = isMock
  ? React.lazy(() => import('./components/MockControls'))
  : null;

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<
    'form' | 'loading' | 'results' | 'empty' | 'error'
  >('form');

  const [currentProfile, setCurrentProfile] = useState<UserProfile>({
    level: 'beginner',
    languages: ['Python'],
    interests: ['developer tools'],
    skills: ['Git'],
    gitExperience: 'basic',
    goal: 'first_contribution',
    context: 'I want to practice writing unit tests.',
  });

  const [resultsData, setResultsData] = useState<RecommendationResponse | null>(null);
  const [currentError, setCurrentError] = useState<ClientApiError | null>(null);
  const [mockScenario, setMockScenario] = useState<string>('auto');

  const activeAbortRef = useRef<AbortController | null>(null);

  const executeRecommendation = async (
    profileToSubmit: UserProfile,
    scenario = mockScenario
  ) => {
    // Abort any existing pending request
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }

    const abortCtrl = new AbortController();
    activeAbortRef.current = abortCtrl;

    setViewState('loading');
    setCurrentError(null);

    try {
      const response = await getRecommendations(profileToSubmit, {
        mockScenario: scenario,
        userSignal: abortCtrl.signal,
      });

      setResultsData(response);

      if (response.recommendations.length === 0) {
        setViewState('empty');
      } else {
        setViewState('results');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted, return to form view
        setViewState('form');
        return;
      }

      if (err instanceof ClientApiError) {
        setCurrentError(err);
      } else {
        setCurrentError(
          new ClientApiError(
            err.message || 'An unexpected error occurred',
            'UNKNOWN_ERROR',
            false
          )
        );
      }
      setViewState('error');
    } finally {
      activeAbortRef.current = null;
    }
  };

  const handleFormSubmit = (submittedProfile: UserProfile) => {
    setCurrentProfile(submittedProfile);
    executeRecommendation(submittedProfile, mockScenario);
  };

  const handleAbort = () => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    setViewState('form');
  };

  const handleRetry = () => {
    executeRecommendation(currentProfile, mockScenario);
  };

  const handleResetToForm = () => {
    setViewState('form');
  };

  const handleMockScenarioSelect = (scenario: string, profileOverride?: UserProfile) => {
    setMockScenario(scenario);
    if (profileOverride) {
      setCurrentProfile(profileOverride);
      executeRecommendation(profileOverride, scenario);
    } else {
      executeRecommendation(currentProfile, scenario);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="app-container">
        <Header />

        {/* Mock Controls and Sample Data Banner only rendered when VITE_USE_MOCK === "true" */}
        {MockControls && (
          <React.Suspense fallback={null}>
            <MockControls
              currentScenario={mockScenario}
              onSelectScenario={handleMockScenarioSelect}
              isLoading={viewState === 'loading'}
            />
          </React.Suspense>
        )}

        {viewState === 'form' && (
          <ProfileForm
            initialProfile={currentProfile}
            onSubmit={handleFormSubmit}
            isLoading={false}
          />
        )}

        {viewState === 'loading' && (
          <LoadingState onAbort={handleAbort} />
        )}

        {viewState === 'results' && resultsData && (
          <RecommendationList
            data={resultsData}
            onReset={handleResetToForm}
          />
        )}

        {viewState === 'empty' && (
          <EmptyState
            onReset={handleResetToForm}
            warnings={resultsData?.warnings}
          />
        )}

        {viewState === 'error' && currentError && (
          <ErrorState
            error={currentError}
            onRetry={handleRetry}
            onReset={handleResetToForm}
          />
        )}

        <AboutSection />
      </main>

      <Footer />
    </div>
  );
};

export default App;
