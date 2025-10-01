export interface MockChapter {
  id: number;
  name: string;
  location?: string;
  memberCount: number;
  totalReferrals?: number;
  totalOneToOnes?: number;
  totalTYFCB?: number;
}

export interface MockMember {
  id: number;
  name: string;
  normalizedName: string;
  email?: string;
  phone?: string;
  company?: string;
  classification?: string;
  chapterId: number;
}

export interface MockReferral {
  id: number;
  giver: string;
  receiver: string;
  date: string;
  weekOf: string;
  notes?: string;
}

export interface MockOneToOne {
  id: number;
  member1: string;
  member2: string;
  date: string;
  location?: string;
  duration?: number;
  notes?: string;
}

export interface MockTYFCB {
  id: number;
  giver?: string;
  receiver: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
}

export const mockChapter = (overrides?: Partial<MockChapter>): MockChapter => ({
  id: 1,
  name: 'Test Chapter',
  location: 'Test City',
  memberCount: 25,
  totalReferrals: 150,
  totalOneToOnes: 89,
  totalTYFCB: 45230,
  ...overrides,
});

export const mockMember = (overrides?: Partial<MockMember>): MockMember => ({
  id: 1,
  name: 'John Doe',
  normalizedName: 'john doe',
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Test Company',
  classification: 'Technology',
  chapterId: 1,
  ...overrides,
});

export const mockReferral = (overrides?: Partial<MockReferral>): MockReferral => ({
  id: 1,
  giver: 'John Doe',
  receiver: 'Jane Smith',
  date: '2024-01-15',
  weekOf: '2024-01-15',
  notes: 'Referred for IT services',
  ...overrides,
});

export const mockOneToOne = (overrides?: Partial<MockOneToOne>): MockOneToOne => ({
  id: 1,
  member1: 'John Doe',
  member2: 'Jane Smith',
  date: '2024-01-15',
  location: 'Coffee Shop',
  duration: 60,
  notes: 'Great networking meeting',
  ...overrides,
});

export const mockTYFCB = (overrides?: Partial<MockTYFCB>): MockTYFCB => ({
  id: 1,
  giver: 'John Doe',
  receiver: 'Jane Smith',
  amount: 5000,
  currency: 'AED',
  date: '2024-01-15',
  description: 'Website development project',
  ...overrides,
});

// Generate arrays of mock data
export const mockChapters = (count: number = 3): MockChapter[] =>
  Array.from({ length: count }, (_, index) => mockChapter({
    id: index + 1,
    name: `Chapter ${String.fromCharCode(65 + index)}`, // Chapter A, B, C...
    memberCount: 20 + Math.floor(Math.random() * 20), // 20-40 members
    totalReferrals: 100 + Math.floor(Math.random() * 100), // 100-200 referrals
    totalOneToOnes: 50 + Math.floor(Math.random() * 50), // 50-100 one-to-ones
    totalTYFCB: 20000 + Math.floor(Math.random() * 50000), // 20k-70k AED
  }));

export const mockMembers = (count: number = 10, chapterId: number = 1): MockMember[] => {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Anna'];
  const lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Miller', 'Davis', 'Garcia', 'Martinez', 'Lopez'];
  const classifications = ['Technology', 'Finance', 'Healthcare', 'Real Estate', 'Marketing', 'Legal', 'Education', 'Consulting'];

  return Array.from({ length: count }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const fullName = `${firstName} ${lastName}`;

    return mockMember({
      id: index + 1,
      name: fullName,
      normalizedName: fullName.toLowerCase(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      company: `${lastName} ${classifications[index % classifications.length]}`,
      classification: classifications[index % classifications.length],
      chapterId,
    });
  });
};

export const mockReferrals = (count: number = 20, members: MockMember[]): MockReferral[] =>
  Array.from({ length: count }, (_, index) => {
    const giver = members[Math.floor(Math.random() * members.length)];
    let receiver = members[Math.floor(Math.random() * members.length)];

    // Ensure giver and receiver are different
    while (receiver.id === giver.id) {
      receiver = members[Math.floor(Math.random() * members.length)];
    }

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

    return mockReferral({
      id: index + 1,
      giver: giver.name,
      receiver: receiver.name,
      date: date.toISOString().split('T')[0],
      weekOf: date.toISOString().split('T')[0],
    });
  });

export const mockOneToOnes = (count: number = 15, members: MockMember[]): MockOneToOne[] =>
  Array.from({ length: count }, (_, index) => {
    const member1 = members[Math.floor(Math.random() * members.length)];
    let member2 = members[Math.floor(Math.random() * members.length)];

    // Ensure member1 and member2 are different
    while (member2.id === member1.id) {
      member2 = members[Math.floor(Math.random() * members.length)];
    }

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

    return mockOneToOne({
      id: index + 1,
      member1: member1.name,
      member2: member2.name,
      date: date.toISOString().split('T')[0],
      duration: 30 + Math.floor(Math.random() * 60), // 30-90 minutes
    });
  });

export const mockTYFCBs = (count: number = 8, members: MockMember[]): MockTYFCB[] =>
  Array.from({ length: count }, (_, index) => {
    const giver = members[Math.floor(Math.random() * members.length)];
    let receiver = members[Math.floor(Math.random() * members.length)];

    // Ensure giver and receiver are different
    while (receiver.id === giver.id) {
      receiver = members[Math.floor(Math.random() * members.length)];
    }

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Random date in last 60 days

    return mockTYFCB({
      id: index + 1,
      giver: giver.name,
      receiver: receiver.name,
      amount: 1000 + Math.floor(Math.random() * 10000), // 1k-11k AED
      date: date.toISOString().split('T')[0],
    });
  });