import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { AssessmentV2Service } from '../../services/assessmentV2Service';
import { toLegacyAssessmentResult } from '../../adapters/toLegacyAssessmentResult';
import type { AssessmentMode, AssessmentSessionClient, V2SessionResult } from '../../types/assessmentV2';
import { ModeSelect } from './ModeSelect';
import { RulesConsent } from './RulesConsent';
import { ResultsReport } from './ResultsReport';
import { SkillGapPlan } from './SkillGapPlan';
import { ActiveAssessmentEngine } from './ActiveAssessmentEngine';

interface AssessmentV2ShellProps {
  domainId: string;
  domainTitle: string;
  roleTitle: string;
}

export const AssessmentV2Shell: React.FC<AssessmentV2ShellProps> = ({
  domainId,
  domainTitle,
  roleTitle,
}) => {
  const { user } = useAuth();
  const { recordFullAssessmentResult } = useStudent();
  const navigate = useNavigate();

  const [step, setStep] = useState<'mode_select' | 'consent' | 'assessment' | 'results'>('mode_select');
  const [selectedMode, setSelectedMode] = useState<AssessmentMode>('practice');
  const [session, setSession] = useState<AssessmentSessionClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<V2SessionResult | null>(null);

  const startSession = async (mode: AssessmentMode, consentData?: any) => {
    try {
      setIsInitializing(true);
      setInitError(null);
      const newSession = await AssessmentV2Service.createSession(
        {
          mode,
          domainId,
          role: roleTitle,
          consent: consentData,
          accommodation: consentData?.accommodations,
        },
        user || undefined
      );
      setSession(newSession);
      setStep('assessment');
    } catch (err: any) {
      setInitError(err.message || 'Failed to start assessment session.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAssessmentSubmitted = (result: V2SessionResult) => {
    setFinalResult(result);
    setStep('results');
    try {
      const legacyResult = toLegacyAssessmentResult(result);
      recordFullAssessmentResult(legacyResult);
    } catch (err: any) {
      console.warn('[AssessmentV2Shell] Legacy record sync warning:', err.message);
    }
  };

  if (step === 'mode_select') {
    return (
      <ModeSelect
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        onContinue={() => {
          if (selectedMode === 'secure') {
            setStep('consent');
          } else {
            startSession('practice');
          }
        }}
      />
    );
  }

  if (step === 'consent') {
    return (
      <RulesConsent
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        isStarting={isInitializing}
        onBack={() => setStep('mode_select')}
        onConsentAndStart={(consentData) => startSession('secure', consentData)}
      />
    );
  }

  if (step === 'results' && finalResult) {
    const weakest = Object.values(finalResult.skillScores || {}).filter(s => s.score < 60);
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
        <ResultsReport
          result={finalResult}
          onRetake={() => setStep('mode_select')}
          onNavigateRoadmap={() => navigate('/student/roadmap')}
          onNavigateSkillGap={() => navigate('/student/skill-gap')}
        />
        <SkillGapPlan weakestSkills={weakest} />
      </div>
    );
  }

  if (step === 'assessment' && session) {
    return (
      <ActiveAssessmentEngine
        session={session}
        user={user || undefined}
        onComplete={handleAssessmentSubmitted}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto my-20 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
      {initError ? (
        <div className="text-xs text-rose-500 mb-4">{initError}</div>
      ) : (
        <div className="text-xs text-slate-500 mb-4">Initializing assessment...</div>
      )}
      <button
        onClick={() => setStep('mode_select')}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium cursor-pointer"
      >
        Return to Mode Select
      </button>
    </div>
  );
};
