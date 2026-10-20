import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MatchScorePopover } from '../components/recruiter/pipeline/MatchScorePopover';
import { PipelineActiveFilterChips } from '../components/recruiter/pipeline/PipelineActiveFilterChips';
import { StickyBulkActionBar } from '../components/recruiter/pipeline/StickyBulkActionBar';
import { recruiterApi } from '../services/recruiterApiService';
import type { PipelineFilterState, MatchBreakdown } from '../services/recruiterApiService';

describe('Recruiter Bulk Evaluation Client Components', () => {
  it('renders MatchScorePopover with 5-factor weights and manual override flag', async () => {
    const mockBreakdown: MatchBreakdown = {
      applicationId: 'app-1',
      candidateId: 'usr-cand-1',
      jobId: 'job-1',
      overallScore: 84,
      currentStage: 'interview_scheduled',
      hasManualOverride: true,
      overrideReason: 'Stage advanced ahead of algorithmic score',
      factors: {
        verifiedSkills: { weight: 35, score: 32, maxScore: 35, label: 'Verified Skills (35%)', details: 'Skills evaluated' },
        assessment: { weight: 25, score: 22, maxScore: 25, label: 'Assessment (25%)', details: 'Practical test' },
        projectRelevance: { weight: 20, score: 16, maxScore: 20, label: 'Project Relevance (20%)', details: 'Repos evaluated' },
        educationFit: { weight: 10, score: 8, maxScore: 10, label: 'Education Fit (10%)', details: 'Degree & CGPA' },
        learningVelocity: { weight: 10, score: 6, maxScore: 10, label: 'Learning Velocity (10%)', details: 'Learning pace' },
      },
      matchedSkills: ['React', 'TypeScript', 'Node.js'],
      missingSkills: ['Docker']
    };

    vi.spyOn(recruiterApi, 'getMatchBreakdown').mockResolvedValue(mockBreakdown);

    render(
      <MatchScorePopover
        applicationId="app-1"
        score={84}
        hasManualOverride={true}
      />
    );

    const badge = screen.getByText('84%');
    expect(badge).toBeDefined();

    // Trigger hover to open popover
    fireEvent.mouseEnter(badge.closest('div') || badge);

    await waitFor(() => {
      expect(screen.getByText('Verified Skills (35%)')).toBeDefined();
    });

    expect(screen.getByText('Assessment (25%)')).toBeDefined();
    expect(screen.getByText('Project Relevance (20%)')).toBeDefined();
    expect(screen.getByText('Education Fit (10%)')).toBeDefined();
    expect(screen.getByText('Learning Velocity (10%)')).toBeDefined();
    expect(screen.getByText('Manual Override')).toBeDefined();
    expect(screen.getByText('React')).toBeDefined();
    expect(screen.getByText('Docker')).toBeDefined();
  });

  it('renders PipelineActiveFilterChips and removes filters correctly', () => {
    const filters: PipelineFilterState = {
      search: 'Rohan',
      skills: ['React'],
      verifiedOnly: true,
      cgpaMin: '8.0',
      gradYear: '2025',
      college: 'IIT Bombay',
      tags: ['top-talent'],
      stage: 'all',
      sortBy: 'match_score',
      sortOrder: 'desc'
    };

    let removedKey: keyof PipelineFilterState | null = null;

    const handleRemoveFilter = (key: keyof PipelineFilterState) => {
      removedKey = key;
    };

    render(
      <PipelineActiveFilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={() => {}}
        totalResults={4}
      />
    );

    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('Search: "Rohan"')).toBeDefined();
    expect(screen.getByText('Verified Skills Only')).toBeDefined();
    expect(screen.getByText('CGPA ≥ 8.0')).toBeDefined();

    // Find remove button for search chip
    const removeBtn = screen.getByLabelText('Remove filter Search: "Rohan"');
    expect(removeBtn).not.toBeNull();
    fireEvent.click(removeBtn);

    expect(removedKey).toBe('search');
  });

  it('renders StickyBulkActionBar with selected count and triggers bulk move dialog', async () => {
    let triggeredMove = false;
    let targetStageMoved = '';

    render(
      <StickyBulkActionBar
        selectedCount={5}
        totalCount={20}
        pipelineStages={[
          { id: 'assessment_invited', label: 'Assessment Invited' },
          { id: 'interview_scheduled', label: 'Interview Scheduled' }
        ]}
        onBulkMoveStage={async (stage) => {
          triggeredMove = true;
          targetStageMoved = stage;
        }}
        onBulkAddTag={async () => {}}
        onBulkShortlist={() => {}}
        onBulkEmail={() => {}}
        onBulkInviteAssessment={() => {}}
        onClearSelection={() => {}}
        onSelectAll={() => {}}
        onCompare={() => {}}
      />
    );

    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText(/Selected/i)).toBeDefined();

    // Select the stage in dropdown
    const stageSelect = screen.getByLabelText('Bulk Move to Stage');
    fireEvent.change(stageSelect, { target: { value: 'interview_scheduled' } });

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Bulk Advance Pipeline Stage/i)).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText(/e\.g\. Cleared automated screening/i);
    fireEvent.change(textarea, { target: { value: 'Bulk moved by test' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Move \(5\)/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(triggeredMove).toBe(true);
      expect(targetStageMoved).toBe('interview_scheduled');
    });
  });
});
