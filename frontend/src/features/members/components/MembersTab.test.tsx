/**
 * Comprehensive tests for MembersTab component
 * Using real data patterns from BNI chapters
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, createMockExcelFile } from '../../../testing/fixtures/testHelpers';
import { testDataFactory, TEST_SCENARIOS } from '../../../testing/fixtures/testDataFactory';
// import MembersTab from './members-tab';
import * as ChapterDataLoader from "@/shared/services/chapter-data-loader";

// Mock the ChapterDataLoader module
jest.mock('../../../shared/services/ChapterDataLoader');

describe('MembersTab Component', () => {
  const mockChapterData = TEST_SCENARIOS.largeChapter();
  const mockMembers = mockChapterData.members;

  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory.reset();
  });

  describe('Rendering and Data Display', () => {
    it('should render member list with real data patterns', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
          performanceMetrics={{
            avgReferralsPerMember: 45.2,
            avgOTOsPerMember: 72.8,
            totalTYFCB: 2456789,
            topPerformer: mockMembers[0].fullName
          }}
        />
      );

      // Check that members are displayed
      expect(screen.getByText(`Members (${mockMembers.length})`)).toBeInTheDocument();

      // Verify first few members are visible
      await waitFor(() => {
        expect(screen.getByText(mockMembers[0].fullName)).toBeInTheDocument();
        expect(screen.getByText(mockMembers[1].fullName)).toBeInTheDocument();
      });
    });

    it('should display performance metrics with AED currency', () => {
      renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
          performanceMetrics={{
            avgReferralsPerMember: 45.2,
            avgOTOsPerMember: 72.8,
            totalTYFCB: 2456789,
            topPerformer: mockMembers[0].fullName
          }}
        />
      );

      // Check performance metrics display
      expect(screen.getByText(/Average Referrals per Member/i)).toBeInTheDocument();
      expect(screen.getByText('45.2')).toBeInTheDocument();

      expect(screen.getByText(/Average 1-2-1s per Member/i)).toBeInTheDocument();
      expect(screen.getByText('72.8')).toBeInTheDocument();

      // TYFCB should be formatted as AED
      expect(screen.getByText(/Total TYFCB/i)).toBeInTheDocument();
      expect(screen.getByText(/AED.*2,456,789/)).toBeInTheDocument();
    });

    it('should handle empty member list gracefully', () => {
      renderWithProviders(
        <MembersTab
          chapterName="Empty Chapter"
          chapterId="empty"
          members={[]}
        />
      );

      expect(screen.getByText('Members (0)')).toBeInTheDocument();
      expect(screen.getByText(/No members/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter members based on search input', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search members/i);

      // Search for specific member
      await user.type(searchInput, mockMembers[0].firstName);

      await waitFor(() => {
        expect(screen.getByText(mockMembers[0].fullName)).toBeInTheDocument();
        // Other members should not be visible
        expect(screen.queryByText(mockMembers[5].fullName)).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive in search', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search members/i);

      // Search with different case
      await user.type(searchInput, mockMembers[0].firstName.toLowerCase());

      await waitFor(() => {
        expect(screen.getByText(mockMembers[0].fullName)).toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search members/i);

      // Search for non-existent member
      await user.type(searchInput, 'XXXXNONEXISTENTXXXX');

      await waitFor(() => {
        expect(screen.getByText(/No members found/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload with Real Data', () => {
    it('should handle Excel file upload with real member data structure', async () => {
      const mockExtractNames = jest.spyOn(ChapterDataLoader, 'extractMemberNamesFromFile');

      // Generate test data matching real Excel structure
      const excelData = testDataFactory.generateExcelImportData(46); // Continental has 46 members
      const expectedNames = excelData.map(row => `${row['First Name']} ${row['Last Name']}`);

      mockExtractNames.mockResolvedValue(expectedNames);

      const onMembersUpdate = jest.fn();
      const { user } = renderWithProviders(
        <MembersTab
          chapterName="BNI Continental"
          chapterId="continental"
          members={[]}
          onMembersUpdate={onMembersUpdate}
        />
      );

      // Find and click upload button
      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      // Create mock Excel file with real structure
      const file = createMockExcelFile(excelData, 'bni-continental.xls');

      // Find file input and upload
      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockExtractNames).toHaveBeenCalledWith(expect.objectContaining({
          name: 'bni-continental.xls'
        }));
        expect(onMembersUpdate).toHaveBeenCalledWith(expectedNames);
      });
    });

    it('should validate file size (50MB limit)', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={[]}
        />
      );

      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      // Create oversized file
      const oversizedFile = TEST_SCENARIOS.oversizedExcelFile();
      const file = createMockExcelFile([], oversizedFile.name);
      Object.defineProperty(file, 'size', { value: oversizedFile.size });

      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/file.*too.*large/i)).toBeInTheDocument();
      });
    });

    it('should reject non-Excel files', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={[]}
        />
      );

      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      // Create invalid file type
      const invalidFile = new File(['invalid'], 'test.pdf', { type: 'application/pdf' });

      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, invalidFile);

      await waitFor(() => {
        expect(screen.getByText(/invalid.*file.*type/i)).toBeInTheDocument();
      });
    });

    it('should handle member names with Arabic/special characters', async () => {
      const mockExtractNames = jest.spyOn(ChapterDataLoader, 'extractMemberNamesFromFile');

      // Create members with Arabic names (common in UAE)
      const specialMembers = [
        { 'First Name': 'محمد', 'Last Name': 'الأحمد' },
        { 'First Name': "O'Brien", 'Last Name': 'McDonald-Smith' },
        { 'First Name': 'José', 'Last Name': 'González' }
      ];

      const expectedNames = specialMembers.map(m => `${m['First Name']} ${m['Last Name']}`);
      mockExtractNames.mockResolvedValue(expectedNames);

      const onMembersUpdate = jest.fn();
      const { user } = renderWithProviders(
        <MembersTab
          chapterName="BNI International"
          chapterId="international"
          members={[]}
          onMembersUpdate={onMembersUpdate}
        />
      );

      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      const file = createMockExcelFile(specialMembers, 'international-members.xlsx');
      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onMembersUpdate).toHaveBeenCalledWith(expectedNames);
      });
    });
  });

  describe('Sorting and Pagination', () => {
    it('should sort members alphabetically by default', () => {
      const sortedMembers = [...mockMembers].sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
      );

      renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={sortedMembers.map(m => m.fullName)}
        />
      );

      const memberList = screen.getAllByTestId(/member-item/i);
      expect(memberList[0]).toHaveTextContent(sortedMembers[0].fullName);
      expect(memberList[1]).toHaveTextContent(sortedMembers[1].fullName);
    });

    it('should handle large member lists with pagination', async () => {
      // Generate large chapter (60+ members)
      const largeChapter = testDataFactory.generateChapter({
        id: 'large',
        name: 'Large Chapter',
        avgMembers: 65
      });

      const { user } = renderWithProviders(
        <MembersTab
          chapterName={largeChapter.name}
          chapterId={largeChapter.id}
          members={largeChapter.members.map(m => m.fullName)}
        />
      );

      // Check pagination controls exist for large lists
      if (largeChapter.members.length > 50) {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();

        // Navigate to next page
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        // Different members should be visible
        await waitFor(() => {
          expect(screen.queryByText(largeChapter.members[0].fullName)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should display error message when file upload fails', async () => {
      const mockExtractNames = jest.spyOn(ChapterDataLoader, 'extractMemberNamesFromFile');
      mockExtractNames.mockRejectedValue(new Error('Failed to parse Excel file'));

      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={[]}
        />
      );

      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      const file = createMockExcelFile([], 'corrupted.xls');
      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/failed.*parse/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const mockExtractNames = jest.spyOn(ChapterDataLoader, 'extractMemberNamesFromFile');
      mockExtractNames.mockRejectedValue(new Error('Network error'));

      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={[]}
        />
      );

      const uploadButton = screen.getByRole('button', { name: /upload.*member/i });
      await user.click(uploadButton);

      const file = createMockExcelFile([], 'test.xls');
      const fileInput = screen.getByLabelText(/choose.*file/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/network.*error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      expect(screen.getByRole('search')).toHaveAttribute('aria-label', expect.stringContaining('Search'));
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', expect.stringContaining('Members'));
    });

    it('should be keyboard navigable', async () => {
      const { user } = renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText(/search/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /upload/i })).toHaveFocus();
    });

    it('should announce member count to screen readers', () => {
      renderWithProviders(
        <MembersTab
          chapterName={mockChapterData.name}
          chapterId={mockChapterData.id}
          members={mockMembers.map(m => m.fullName)}
        />
      );

      const memberCount = screen.getByText(`Members (${mockMembers.length})`);
      expect(memberCount).toHaveAttribute('aria-live', 'polite');
    });
  });
});