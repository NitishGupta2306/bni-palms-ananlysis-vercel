/**
 * Comprehensive Test Suite Configuration
 * Central configuration for all test types with real data patterns
 */

import { testDataFactory } from './testDataFactory';

/**
 * Test Suite Configuration with Real BNI Data Patterns
 */
export const TEST_CONFIG = {
  // Based on actual BNI chapter data from August 2025
  chapters: {
    continental: {
      id: 'continental',
      name: 'BNI Continental',
      memberCount: 46,
      location: 'Radisson Blu, Deira',
      meetingTime: '7:00 AM',
      avgReferrals: 72,
      avgOTO: 53,
      avgTYFCB: 235036
    },
    elevate: {
      id: 'elevate',
      name: 'BNI Elevate',
      memberCount: 42,
      location: 'JW Marriott, Marina',
      meetingTime: '7:30 AM',
      avgReferrals: 54,
      avgOTO: 85,
      avgTYFCB: 186394
    },
    energy: {
      id: 'energy',
      name: 'BNI Energy',
      memberCount: 38,
      location: 'Hilton, JBR',
      meetingTime: '12:00 PM',
      avgReferrals: 42,
      avgOTO: 92,
      avgTYFCB: 163538
    }
  },

  // Slip types and their distributions (from real data)
  slipTypes: {
    distribution: {
      'One-to-One': 26.3, // 135 of 513
      'Referral': 45.2,   // 232 of 513
      'CEU': 13.8,        // 71 of 513
      'Visitor': 0.4,     // 2 of 513
      'TYFCB': 14.2       // 73 of 513
    },
    referralTiers: {
      'Tier 1 (inside)': 60,
      'Tier 2 (outside)': 30,
      'Tier 3 (outside)': 10
    }
  },

  // Performance metrics ranges (from real data)
  performanceRanges: {
    attendance: {
      present: { min: 10, max: 25 },
      absent: { min: 0, max: 5 },
      late: { min: 0, max: 3 },
      medical: { min: 0, max: 2 },
      substitute: { min: 0, max: 4 }
    },
    referrals: {
      givenInside: { min: 20, max: 150 },
      givenOutside: { min: 0, max: 20 },
      receivedInside: { min: 15, max: 120 },
      receivedOutside: { min: 10, max: 130 }
    },
    oneToOnes: { min: 30, max: 120 },
    tyfcb: { min: 10000, max: 500000 },
    ceu: { min: 20, max: 80 },
    visitors: { min: 0, max: 10 }
  },

  // File upload constraints (from excelSecurity.ts)
  fileConstraints: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.xls', '.xlsx'],
    maxSheets: 10,
    maxRows: 10000,
    maxCols: 100
  },

  // Test timeouts
  timeouts: {
    unit: 5000,
    integration: 15000,
    e2e: 30000,
    fileUpload: 20000
  },

  // API endpoints for mocking
  apiEndpoints: {
    dashboard: '/api/dashboard/',
    chapters: '/api/chapters/',
    reports: '/api/chapters/:chapterId/reports/',
    members: '/api/chapters/:chapterId/members/',
    matrices: {
      referral: '/api/chapters/:chapterId/reports/:reportId/referral-matrix/',
      oneToOne: '/api/chapters/:chapterId/reports/:reportId/one-to-one-matrix/',
      combination: '/api/chapters/:chapterId/reports/:reportId/combination-matrix/'
    },
    upload: '/api/chapters/:chapterId/upload/'
  }
};

/**
 * Generate test data for different scenarios
 */
export class TestDataGenerator {
  private factory = testDataFactory;

  /**
   * Generate a complete test chapter with all relationships
   */
  generateCompleteChapter(chapterConfig: typeof TEST_CONFIG.chapters.continental) {
    const members = Array.from({ length: chapterConfig.memberCount }, () =>
      this.factory.generateMember({ chapterId: chapterConfig.id })
    );

    const slips = this.generateSlipsForChapter(members, 500);
    const matrices = this.generateMatricesForChapter(members);

    return {
      chapter: {
        ...chapterConfig,
        members
      },
      slips,
      matrices,
      report: this.factory.generateMonthlyReport(chapterConfig.id)
    };
  }

  /**
   * Generate realistic slip data based on actual distributions
   */
  private generateSlipsForChapter(members: any[], count: number) {
    const slips = [];
    const distribution = TEST_CONFIG.slipTypes.distribution;

    Object.entries(distribution).forEach(([type, percentage]) => {
      const slipCount = Math.floor(count * (percentage / 100));
      for (let i = 0; i < slipCount; i++) {
        slips.push(this.factory.generateSlipAuditData(members, type));
      }
    });

    return slips;
  }

  /**
   * Generate interaction matrices
   */
  private generateMatricesForChapter(members: any[]) {
    return {
      referralMatrix: this.factory.generateMatrixData(members, 'referral'),
      otoMatrix: this.factory.generateMatrixData(members, 'oto'),
      combinationMatrix: this.factory.generateMatrixData(members, 'combination')
    };
  }

  /**
   * Generate test data for specific test scenarios
   */
  generateScenarioData(scenario: 'empty' | 'small' | 'medium' | 'large' | 'error') {
    switch (scenario) {
      case 'empty':
        return {
          chapter: { ...TEST_CONFIG.chapters.continental, members: [], memberCount: 0 },
          slips: [],
          matrices: {}
        };

      case 'small':
        return this.generateCompleteChapter({
          ...TEST_CONFIG.chapters.continental,
          memberCount: 15
        });

      case 'medium':
        return this.generateCompleteChapter(TEST_CONFIG.chapters.continental);

      case 'large':
        return this.generateCompleteChapter({
          ...TEST_CONFIG.chapters.continental,
          memberCount: 65
        });

      case 'error':
        return {
          chapter: null,
          error: 'Failed to load chapter data',
          status: 500
        };

      default:
        return this.generateCompleteChapter(TEST_CONFIG.chapters.continental);
    }
  }
}

/**
 * Test data seeder for integration tests
 */
export class TestDataSeeder {
  private generator = new TestDataGenerator();

  /**
   * Seed database with test data (for integration tests)
   */
  async seedDatabase() {
    const chapters = Object.values(TEST_CONFIG.chapters);
    const seedData = [];

    for (const chapterConfig of chapters) {
      const data = this.generator.generateCompleteChapter(chapterConfig);
      seedData.push(data);
    }

    return seedData;
  }

  /**
   * Clean up test data
   */
  async cleanupDatabase() {
    // Implementation would depend on your backend setup
    // This is a placeholder for cleanup logic
    return Promise.resolve();
  }
}

/**
 * Mock API responses based on real data patterns
 */
export class MockAPIResponses {
  private generator = new TestDataGenerator();

  getDashboardResponse() {
    return {
      chapters: Object.values(TEST_CONFIG.chapters).map(chapter => ({
        id: chapter.id,
        name: chapter.name,
        member_count: chapter.memberCount,
        avg_referrals_per_member: chapter.avgReferrals,
        avg_otos_per_member: chapter.avgOTO,
        total_tyfcb: chapter.avgTYFCB * chapter.memberCount
      }))
    };
  }

  getChapterDetailResponse(chapterId: string) {
    const chapterConfig = TEST_CONFIG.chapters[chapterId as keyof typeof TEST_CONFIG.chapters];
    if (!chapterConfig) {
      return { error: 'Chapter not found', status: 404 };
    }

    const data = this.generator.generateCompleteChapter(chapterConfig);
    return {
      chapter: data.chapter,
      members: data.chapter.members,
      latest_report: data.report,
      performance_metrics: {
        avg_referrals: chapterConfig.avgReferrals,
        avg_otos: chapterConfig.avgOTO,
        total_tyfcb: chapterConfig.avgTYFCB * chapterConfig.memberCount,
        top_performers: data.chapter.members.slice(0, 5).map(m => ({
          id: m.id,
          name: m.fullName,
          referrals: Math.floor(Math.random() * 100) + 50
        }))
      }
    };
  }

  getMatrixResponse(type: 'referral' | 'oto' | 'combination', memberCount: number = 46) {
    const members = Array.from({ length: memberCount }, () =>
      testDataFactory.generateMember()
    );
    return testDataFactory.generateMatrixData(members, type);
  }

  getUploadSuccessResponse() {
    return {
      success: true,
      message: 'File uploaded successfully',
      records_created: {
        members: 46,
        referrals: 232,
        one_to_ones: 135,
        tyfcb: 73
      }
    };
  }

  getUploadErrorResponse(errorType: 'validation' | 'size' | 'format' | 'server') {
    const errors = {
      validation: {
        error: 'Validation failed',
        details: ['Invalid data in row 15', 'Missing required field: Last Name'],
        status: 400
      },
      size: {
        error: 'File too large',
        details: ['Maximum file size is 10MB'],
        status: 413
      },
      format: {
        error: 'Invalid file format',
        details: ['Only .xls and .xlsx files are allowed'],
        status: 415
      },
      server: {
        error: 'Internal server error',
        details: ['An unexpected error occurred'],
        status: 500
      }
    };

    return errors[errorType];
  }
}

// Export singletons for convenience
export const testDataGenerator = new TestDataGenerator();
export const testDataSeeder = new TestDataSeeder();
export const mockAPIResponses = new MockAPIResponses();