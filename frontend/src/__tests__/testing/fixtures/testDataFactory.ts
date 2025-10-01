/**
 * Test Data Factory with Anonymized Real Data Patterns
 * Based on actual BNI chapter data structures from August 2025
 */

import { faker } from '@faker-js/faker';

// Industry classifications based on real BNI data
const BUSINESS_CLASSIFICATIONS = [
  'Accounting & Tax Services',
  'Digital Marketing',
  'Real Estate',
  'Insurance Services',
  'Legal Services',
  'IT Solutions',
  'Financial Planning',
  'Construction & Engineering',
  'Healthcare Services',
  'Business Consulting',
  'Printing & Design',
  'Education & Training',
  'Event Management',
  'Photography & Videography',
  'Interior Design',
  'Logistics & Shipping',
  'Security Services',
  'Cleaning Services',
  'Travel & Tourism',
  'Automotive Services'
];

// Realistic business name patterns
const BUSINESS_PATTERNS = [
  '[Industry] Solutions LLC',
  '[Industry] Partners',
  '[Name] [Industry] Group',
  '[Industry] Experts',
  'Premium [Industry]',
  '[Industry] Pro',
  '[Name] & Associates',
  '[Industry] Hub',
  'Elite [Industry]',
  '[Industry] Zone'
];

// Based on real chapter names
const CHAPTERS = [
  { id: 'continental', name: 'BNI Continental', avgMembers: 46 },
  { id: 'elevate', name: 'BNI Elevate', avgMembers: 42 },
  { id: 'energy', name: 'BNI Energy', avgMembers: 38 },
  { id: 'excelerate', name: 'BNI Excelerate', avgMembers: 40 },
  { id: 'givers', name: 'BNI Givers', avgMembers: 44 },
  { id: 'gladiators', name: 'BNI Gladiators', avgMembers: 41 },
  { id: 'legends', name: 'BNI Legends', avgMembers: 39 },
  { id: 'synergy', name: 'BNI Synergy', avgMembers: 43 },
  { id: 'united', name: 'BNI United', avgMembers: 45 }
];

// Realistic TYFCB amounts in AED based on actual data
const TYFCB_RANGES = {
  small: { min: 100, max: 5000 },
  medium: { min: 5000, max: 50000 },
  large: { min: 50000, max: 500000 }
};

export class TestDataFactory {
  private usedEmails = new Set<string>();
  private usedPhones = new Set<string>();

  /**
   * Generate anonymized member data based on real patterns
   */
  generateMember(overrides: Partial<any> = {}) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const classification = faker.helpers.arrayElement(BUSINESS_CLASSIFICATIONS);

    // Generate unique email
    let email: string;
    do {
      email = faker.internet.email({ firstName, lastName }).toLowerCase();
    } while (this.usedEmails.has(email));
    this.usedEmails.add(email);

    // Generate unique UAE phone number
    let phone: string;
    do {
      phone = `+971${faker.number.int({ min: 50, max: 58 })}${faker.number.int({ min: 1000000, max: 9999999 })}`;
    } while (this.usedPhones.has(phone));
    this.usedPhones.add(phone);

    const businessName = this.generateBusinessName(classification, lastName);

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      businessName,
      classification,
      chapterId: faker.helpers.arrayElement(CHAPTERS).id,
      joinDate: faker.date.between({ from: '2020-01-01', to: '2024-12-31' }),
      isActive: faker.datatype.boolean({ probability: 0.95 }),
      ...overrides
    };
  }

  /**
   * Generate realistic business name
   */
  private generateBusinessName(classification: string, ownerLastName: string): string {
    const pattern = faker.helpers.arrayElement(BUSINESS_PATTERNS);
    const industry = classification.split('&')[0].trim();

    return pattern
      .replace('[Industry]', industry)
      .replace('[Name]', ownerLastName);
  }

  /**
   * Generate member performance stats based on real data patterns
   */
  generateMemberStats(memberId?: string) {
    // Based on real data: P, A, L, M, S, RGI, RGO, RRI, RRO, V, 1-2-1, TYFCB, CEU
    return {
      memberId: memberId || faker.string.uuid(),
      present: faker.number.int({ min: 10, max: 25 }), // P
      absent: faker.number.int({ min: 0, max: 5 }), // A
      late: faker.number.int({ min: 0, max: 3 }), // L
      medical: faker.number.int({ min: 0, max: 2 }), // M
      substitute: faker.number.int({ min: 0, max: 4 }), // S
      referralsGivenInside: faker.number.int({ min: 20, max: 150 }), // RGI
      referralsGivenOutside: faker.number.int({ min: 0, max: 20 }), // RGO
      referralsReceivedInside: faker.number.int({ min: 15, max: 120 }), // RRI
      referralsReceivedOutside: faker.number.int({ min: 10, max: 130 }), // RRO
      visitors: faker.number.int({ min: 0, max: 10 }), // V
      oneToOnes: faker.number.int({ min: 30, max: 120 }), // 1-2-1
      tyfcb: faker.number.int({ min: 10000, max: 500000 }), // TYFCB in AED
      ceu: faker.number.int({ min: 20, max: 80 }), // CEU credits
      custom: faker.number.int({ min: 0, max: 5 }) // Custom field
    };
  }

  /**
   * Generate slip audit data based on real patterns
   */
  generateSlipAuditData(members: any[], slipType?: string) {
    const types = slipType ? [slipType] : ['One-to-One', 'Referral', 'CEU', 'Visitor', 'TYFCB'];
    const selectedType = faker.helpers.arrayElement(types);

    const fromMember = faker.helpers.arrayElement(members);
    const toMember = faker.helpers.arrayElement(members.filter(m => m.id !== fromMember.id));

    const baseData = {
      slipType: selectedType,
      date: faker.date.recent({ days: 30 }),
      weekOf: this.getWeekOf(new Date())
    };

    switch (selectedType) {
      case 'One-to-One':
        return {
          ...baseData,
          from: fromMember.fullName,
          to: toMember.fullName,
          detail: faker.helpers.arrayElement([
            'BNI Energy, Deira Dubai, United Arab Emirates',
            'Office Meeting, Business Bay',
            'Zoom Meeting',
            'Coffee Meeting, JLT'
          ])
        };

      case 'Referral':
        return {
          ...baseData,
          from: fromMember.fullName,
          to: toMember.fullName,
          insideOutside: faker.helpers.arrayElement(['Tier 1 (inside)', 'Tier 2 (outside)', 'Tier 3 (outside)'])
        };

      case 'CEU':
        return {
          ...baseData,
          from: fromMember.fullName,
          ceuCredits: faker.number.int({ min: 1, max: 30 }).toString()
        };

      case 'Visitor':
        return {
          ...baseData,
          from: fromMember.fullName,
          to: faker.person.fullName() // Visitor is not a member
        };

      case 'TYFCB':
        const range = faker.helpers.arrayElement(['small', 'medium', 'large']);
        const amount = faker.number.int(TYFCB_RANGES[range]);
        return {
          ...baseData,
          to: toMember.fullName,
          from: faker.datatype.boolean() ? fromMember.fullName : null, // Can be external
          tyfcbAmount: amount.toFixed(2)
        };

      default:
        return baseData;
    }
  }

  /**
   * Generate chapter data with members
   */
  generateChapter(chapterInfo?: typeof CHAPTERS[0]) {
    const chapter = chapterInfo || faker.helpers.arrayElement(CHAPTERS);
    const memberCount = faker.number.int({
      min: chapter.avgMembers - 5,
      max: chapter.avgMembers + 5
    });

    const members = Array.from({ length: memberCount }, (_, i) => ({
      id: faker.string.uuid(),
      ...this.generateMember({ chapterId: chapter.id }),
      stats: this.generateMemberStats()
    }));

    return {
      ...chapter,
      members,
      memberCount,
      createdAt: faker.date.past({ years: 5 }),
      meetingDay: faker.helpers.arrayElement(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      meetingTime: faker.helpers.arrayElement(['7:00 AM', '7:30 AM', '12:00 PM', '6:00 PM']),
      location: faker.helpers.arrayElement([
        'Radisson Blu, Deira',
        'JW Marriott, Marina',
        'Hilton, JBR',
        'Sheraton, Sheikh Zayed Road',
        'Ritz Carlton, DIFC'
      ])
    };
  }

  /**
   * Generate Excel import data matching real structure
   */
  generateExcelImportData(memberCount: number = 20) {
    const members = Array.from({ length: memberCount }, () => {
      const member = this.generateMember();
      const stats = this.generateMemberStats();

      return {
        'First Name': member.firstName,
        'Last Name': member.lastName,
        'P': stats.present,
        'A': stats.absent,
        'L': stats.late,
        'M': stats.medical,
        'S': stats.substitute,
        'RGI': stats.referralsGivenInside,
        'RGO': stats.referralsGivenOutside,
        'RRI': stats.referralsReceivedInside,
        'RRO': stats.referralsReceivedOutside,
        'V': stats.visitors,
        '1-2-1': stats.oneToOnes,
        'TYFCB': stats.tyfcb,
        'CEU': stats.ceu,
        'Custom': stats.custom
      };
    });

    return members;
  }

  /**
   * Generate matrix data for testing
   */
  generateMatrixData(members: any[], matrixType: 'referral' | 'oto' | 'combination') {
    const matrix: any = {};

    members.forEach(fromMember => {
      matrix[fromMember.fullName] = {};

      members.forEach(toMember => {
        if (fromMember.id === toMember.id) {
          matrix[fromMember.fullName][toMember.fullName] = 0;
        } else {
          switch (matrixType) {
            case 'referral':
              matrix[fromMember.fullName][toMember.fullName] = faker.number.int({ min: 0, max: 10 });
              break;
            case 'oto':
              matrix[fromMember.fullName][toMember.fullName] = faker.datatype.boolean({ probability: 0.7 }) ? 1 : 0;
              break;
            case 'combination':
              matrix[fromMember.fullName][toMember.fullName] = {
                referrals: faker.number.int({ min: 0, max: 10 }),
                oneToOnes: faker.datatype.boolean({ probability: 0.7 }) ? 1 : 0
              };
              break;
          }
        }
      });
    });

    return matrix;
  }

  /**
   * Generate monthly report data
   */
  generateMonthlyReport(chapterId: string) {
    const monthYear = faker.date.recent({ days: 90 }).toISOString().slice(0, 7);

    return {
      id: faker.number.int({ min: 1, max: 1000 }),
      chapterId,
      monthYear,
      uploadedAt: faker.date.recent({ days: 30 }),
      processedAt: faker.datatype.boolean() ? faker.date.recent({ days: 29 }) : null,
      slipAuditFile: faker.datatype.boolean() ? `slip_audit_${monthYear}.xls` : null,
      memberNamesFile: faker.datatype.boolean() ? `members_${monthYear}.xls` : null,
      hasReferralMatrix: faker.datatype.boolean({ probability: 0.8 }),
      hasOtoMatrix: faker.datatype.boolean({ probability: 0.8 }),
      hasCombinationMatrix: faker.datatype.boolean({ probability: 0.6 })
    };
  }

  /**
   * Get week of date (for slip tracking)
   */
  private getWeekOf(date: Date): string {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toISOString().slice(0, 10);
  }

  /**
   * Reset factory state
   */
  reset() {
    this.usedEmails.clear();
    this.usedPhones.clear();
  }
}

// Export singleton instance
export const testDataFactory = new TestDataFactory();

// Export test data presets for common scenarios
export const TEST_SCENARIOS = {
  smallChapter: () => {
    const factory = new TestDataFactory();
    return factory.generateChapter({ id: 'test-small', name: 'Test Small Chapter', avgMembers: 15 });
  },

  largeChapter: () => {
    const factory = new TestDataFactory();
    return factory.generateChapter({ id: 'test-large', name: 'Test Large Chapter', avgMembers: 60 });
  },

  highPerformingMember: () => {
    const factory = new TestDataFactory();
    return {
      ...factory.generateMember(),
      stats: {
        ...factory.generateMemberStats(),
        referralsGivenInside: 150,
        oneToOnes: 120,
        tyfcb: 500000,
        present: 25,
        absent: 0
      }
    };
  },

  lowPerformingMember: () => {
    const factory = new TestDataFactory();
    return {
      ...factory.generateMember(),
      stats: {
        ...factory.generateMemberStats(),
        referralsGivenInside: 5,
        oneToOnes: 10,
        tyfcb: 1000,
        present: 10,
        absent: 10
      }
    };
  },

  validExcelFile: () => {
    const factory = new TestDataFactory();
    return {
      name: 'test-import.xlsx',
      size: 50000,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: factory.generateExcelImportData(30)
    };
  },

  invalidExcelFile: () => ({
    name: 'invalid.txt',
    size: 100,
    type: 'text/plain',
    data: 'Invalid content'
  }),

  oversizedExcelFile: () => ({
    name: 'huge-file.xlsx',
    size: 15 * 1024 * 1024, // 15MB
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    data: []
  })
};