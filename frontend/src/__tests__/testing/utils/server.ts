// Polyfills for MSW - MUST come first before any MSW imports
const { TextEncoder, TextDecoder } = require('util');
Object.assign(global, { TextDecoder, TextEncoder });

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  mockChapters,
  mockMembers,
  mockReferrals,
  mockOneToOnes,
  mockTYFCBs,
  mockChapter
} from './mockData';

// Create realistic mock data
const chapters = mockChapters(3);
const chapterMembers = chapters.reduce((acc, chapter) => {
  acc[chapter.id] = mockMembers(25, chapter.id);
  return acc;
}, {} as Record<number, any[]>);

export const handlers = [
  // Chapter endpoints
  http.get('/api/chapters/', () => {
    return HttpResponse.json(chapters);
  }),

  http.get('/api/chapters/:id/', ({ params }: { params: any }) => {
    const id = parseInt(params.id as string);
    const chapter = chapters.find(c => c.id === id);

    if (!chapter) {
      return HttpResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    return HttpResponse.json(chapter);
  }),

  http.get('/api/chapters/:id/members/', ({ params }: { params: any }) => {
    const id = parseInt(params.id as string);
    const members = chapterMembers[id] || [];

    return HttpResponse.json(members);
  }),

  http.get('/api/chapters/:id/analytics/', ({ params }: { params: any }) => {
    const id = parseInt(params.id as string);
    const members = chapterMembers[id] || [];
    const referrals = mockReferrals(50, members);
    const oneToOnes = mockOneToOnes(30, members);
    const tyfcbs = mockTYFCBs(15, members);

    return HttpResponse.json({
      members,
      referrals,
      oneToOnes,
      tyfcbs,
      matrices: {
        referralMatrix: generateMatrix(members, referrals),
        oneToOneMatrix: generateMatrix(members, oneToOnes),
        tyfcbMatrix: generateMatrix(members, tyfcbs),
      },
    });
  }),

  // File upload endpoint
  http.post('/api/chapters/:id/upload/', async ({ request, params }: { request: any; params: any }) => {
    const id = parseInt(params.id as string);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const formData = await request.formData();
    const file = formData.get('slip_audit_file') as File;

    if (!file) {
      return HttpResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Simulate file validation
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return HttpResponse.json(
        {
          error: 'Invalid file format. Please upload an Excel file (.xlsx)',
          code: 'INVALID_FILE_FORMAT'
        },
        { status: 400 }
      );
    }

    // Simulate file size check
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return HttpResponse.json(
        {
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'File uploaded and processed successfully',
      recordsCreated: 25,
      membersProcessed: 25,
      referralsCreated: 45,
      oneToOnesCreated: 30,
      tyfcbCreated: 12,
      chapterId: id,
    });
  }),

  // Error scenario endpoints for testing
  http.get('/api/chapters/error/', () => {
    return HttpResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }),

  http.get('/api/chapters/:id/network-error/', ({ params }: { params: any }) => {
    // This will cause a network error
    return HttpResponse.error();
  }),

  http.post('/api/chapters/:id/upload-error/', ({ params }: { params: any }) => {
    return HttpResponse.json(
      {
        error: 'Failed to process uploaded file',
        code: 'PROCESSING_ERROR',
        details: { stage: 'parsing', line: 15 }
      },
      { status: 422 }
    );
  }),

  // Rate limiting test endpoint
  http.get('/api/chapters/rate-limit/', () => {
    return HttpResponse.json(
      {
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMIT_ERROR'
      },
      { status: 429 }
    );
  }),
];

// Helper function to generate interaction matrices
function generateMatrix(members: any[], interactions: any[]) {
  const matrix = members.map(member => ({
    memberName: member.name,
    interactions: members.map(otherMember => {
      if (member.id === otherMember.id) return 0;

      const count = interactions.filter(interaction =>
        (interaction.giver === member.name && interaction.receiver === otherMember.name) ||
        (interaction.member1 === member.name && interaction.member2 === otherMember.name) ||
        (interaction.member2 === member.name && interaction.member1 === otherMember.name)
      ).length;

      return count;
    }),
    total: interactions.filter(interaction =>
      interaction.giver === member.name ||
      interaction.member1 === member.name ||
      interaction.member2 === member.name
    ).length,
  }));

  return matrix;
}

export const server = setupServer(...handlers);

// Helper functions for tests to override handlers
export const overrideHandler = (newHandler: any) => {
  server.use(newHandler);
};

export const resetHandlers = () => {
  server.resetHandlers();
};