import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ChapterDashboard from './chapter-dashboard';
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";

expect.extend(toHaveNoViolations);

const mockChapterData: ChapterMemberData[] = [
  {
    chapterId: '1',
    chapterName: 'Alpha Chapter',
    memberCount: 25,
    members: [],
    loadedAt: new Date('2024-01-15'),
    loadError: null,
    performanceMetrics: {
      totalReferrals: 50,
      totalOTOs: 30,
      totalTYFCB: 15000,
      avgReferralsPerMember: 2.0,
      avgOTOsPerMember: 1.2,
      avgTYFCBPerMember: 600,
    }
  },
  {
    chapterId: '2',
    chapterName: 'Beta Chapter',
    memberCount: 30,
    members: [],
    loadedAt: new Date('2024-01-15'),
    loadError: null,
    performanceMetrics: {
      totalReferrals: 60,
      totalOTOs: 40,
      totalTYFCB: 20000,
      avgReferralsPerMember: 2.5,
      avgOTOsPerMember: 1.5,
      avgTYFCBPerMember: 800,
    }
  },
  {
    chapterId: '3',
    chapterName: 'Gamma Chapter',
    memberCount: 15,
    members: [],
    loadedAt: new Date('2024-01-15'),
    loadError: 'Failed to load member data',
  }
];

const renderChapterDashboard = (props = {}) => {
  const defaultProps = {
    chapterData: mockChapterData,
    isLoading: false,
    onChapterSelect: jest.fn(),
    onChapterAdded: jest.fn(),
  };

  return render(<ChapterDashboard {...defaultProps} {...props} />);
};

describe('ChapterDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading state when chapters are being loaded', () => {
      renderChapterDashboard({ chapterData: [], isLoading: true });

      expect(screen.getByText('Loading chapters...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we fetch your data')).toBeInTheDocument();
    });
  });

  describe('Chapter Display', () => {
    it('renders chapter list correctly', () => {
      renderChapterDashboard();

      expect(screen.getByText('Alpha Chapter')).toBeInTheDocument();
      expect(screen.getByText('Beta Chapter')).toBeInTheDocument();
      expect(screen.getByText('Gamma Chapter')).toBeInTheDocument();
    });

    it('displays dashboard statistics correctly', () => {
      renderChapterDashboard();

      expect(screen.getByText('3')).toBeInTheDocument(); // Total chapters
      expect(screen.getByText('70')).toBeInTheDocument(); // Total members (25+30+15)
      expect(screen.getByText('23')).toBeInTheDocument(); // Average members per chapter
      expect(screen.getByText('67%')).toBeInTheDocument(); // Success rate (2/3 * 100)
    });

    it('shows empty state when no chapters are available', () => {
      renderChapterDashboard({ chapterData: [] });

      expect(screen.getByText('No chapters found')).toBeInTheDocument();
      expect(screen.getByText('Contact your administrator to add BNI chapters')).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts chapters by name by default', () => {
      renderChapterDashboard();

      const chapterNames = screen.getAllByTestId(/chapter-name-/);
      expect(chapterNames[0]).toHaveTextContent('Alpha Chapter');
      expect(chapterNames[1]).toHaveTextContent('Beta Chapter');
      expect(chapterNames[2]).toHaveTextContent('Gamma Chapter');
    });

    it('sorts chapters by member count when selected', async () => {
      const user = userEvent.setup();
      renderChapterDashboard();

      const sortSelect = screen.getByRole('combobox');
      await user.click(sortSelect);

      const memberCountOption = screen.getByText('Member Count');
      await user.click(memberCountOption);

      await waitFor(() => {
        const chapterNames = screen.getAllByTestId(/chapter-name-/);
        expect(chapterNames[0]).toHaveTextContent('Beta Chapter'); // 30 members
        expect(chapterNames[1]).toHaveTextContent('Alpha Chapter'); // 25 members
        expect(chapterNames[2]).toHaveTextContent('Gamma Chapter'); // 15 members
      });
    });

    it('sorts chapters by performance when selected', async () => {
      const user = userEvent.setup();
      renderChapterDashboard();

      const sortSelect = screen.getByRole('combobox');
      await user.click(sortSelect);

      const performanceOption = screen.getByText('Performance');
      await user.click(performanceOption);

      await waitFor(() => {
        const chapterNames = screen.getAllByTestId(/chapter-name-/);
        expect(chapterNames[0]).toHaveTextContent('Beta Chapter'); // Higher performance score
        expect(chapterNames[1]).toHaveTextContent('Alpha Chapter');
        expect(chapterNames[2]).toHaveTextContent('Gamma Chapter'); // Error state = 0 score
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onChapterSelect when chapter card is clicked', async () => {
      const mockOnChapterSelect = jest.fn();
      const user = userEvent.setup();
      renderChapterDashboard({ onChapterSelect: mockOnChapterSelect });

      const alphaChapterCard = screen.getByTestId('chapter-card-1');
      await user.click(alphaChapterCard);

      expect(mockOnChapterSelect).toHaveBeenCalledWith(mockChapterData[0]);
    });

    it('handles keyboard navigation for chapter cards', async () => {
      const mockOnChapterSelect = jest.fn();
      const user = userEvent.setup();
      renderChapterDashboard({ onChapterSelect: mockOnChapterSelect });

      const alphaChapterCard = screen.getByTestId('chapter-card-1');
      alphaChapterCard.focus();
      await user.keyboard('{Enter}');

      expect(mockOnChapterSelect).toHaveBeenCalledWith(mockChapterData[0]);
    });
  });

  describe('Error Handling', () => {
    it('displays error state for chapters with load errors', () => {
      renderChapterDashboard();

      expect(screen.getByText(/Failed to load member data/)).toBeInTheDocument();
    });

    it('handles chapters with missing performance metrics', () => {
      const dataWithoutMetrics = [{
        ...mockChapterData[0],
        performanceMetrics: undefined
      }];

      renderChapterDashboard({ chapterData: dataWithoutMetrics });

      // Should still render without crashing
      expect(screen.getByText('Alpha Chapter')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = renderChapterDashboard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels for interactive elements', () => {
      renderChapterDashboard();

      const sortSelect = screen.getByRole('combobox');
      expect(sortSelect).toHaveAccessibleName();

      const chapterCards = screen.getAllByRole('button');
      chapterCards.forEach(card => {
        expect(card).toHaveAccessibleName();
      });
    });

    it('supports keyboard navigation', () => {
      renderChapterDashboard();

      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex', expect.any(String));
      });
    });
  });

  describe('Performance Metrics Display', () => {
    it('formats numbers correctly', () => {
      renderChapterDashboard();

      // Check if large numbers are formatted properly (e.g., 70 instead of 70000)
      expect(screen.getByText('70')).toBeInTheDocument(); // Total members
    });

    it('calculates success percentage correctly', () => {
      renderChapterDashboard();

      // 2 successful loads out of 3 total chapters = 67%
      expect(screen.getByText('67%')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for different screen sizes', () => {
      renderChapterDashboard();

      const dashboard = screen.getByTestId('chapter-dashboard');
      expect(dashboard).toHaveClass('animate-fade-in');

      // Check for responsive grid classes
      const statsContainer = screen.getByTestId('dashboard-stats');
      expect(statsContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });
});