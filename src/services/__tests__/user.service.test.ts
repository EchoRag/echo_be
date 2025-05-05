import { UserService } from '../user.service';
import { AppDataSource } from '../../config/database';
import { User as ClerkUser } from '@clerk/express';
import { User } from '../../models/user.model';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;
  let mockClerkUser: ClerkUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock repository
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockImplementation(async (user: Partial<User>) => ({ ...user, id: 1 })),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);

    // Setup mock Clerk user with required properties
    mockClerkUser = {
      id: 'clerk_123',
      emailAddresses: [
        {
          id: 'email_123',
          emailAddress: 'test@example.com',
          verification: { status: 'verified' },
          linkedTo: []
        }
      ],
      firstName: 'John',
      lastName: 'Doe',
      _raw: {},
      raw: {},
      primaryEmailAddress: null,
      primaryEmailAddressId: null,
      primaryPhoneNumber: null,
      primaryPhoneNumberId: null,
      primaryWeb3WalletId: null,
      phoneNumbers: [],
      web3Wallets: [],
      externalAccounts: [],
      organizationMemberships: [],
      organizationMembership: null,
      passwordEnabled: false,
      totpEnabled: false,
      backupCodeEnabled: false,
      twoFactorEnabled: false,
      banned: false,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      profileImageUrl: '',
      imageUrl: '',
      hasImage: false,
      gender: '',
      birthday: '',
      externalAccount: null,
      externalId: null,
      lastSignInAt: null,
      object: 'user',
      username: null,
      publicMetadata: {},
      privateMetadata: {},
      unsafeMetadata: {},
      emailAddress: null,
      phoneNumber: null,
      lastActiveAt: null,
      fullName: 'John Doe',
      legalAcceptedAt: null
    } as unknown as ClerkUser;

    // Create service instance
    userService = new UserService();
  });

  describe('getUserMiddleware', () => {
    it('should return existing user when found', async () => {
      const existingUser = {
        id: 1,
        providerUid: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const result = await userService.getUserMiddleware(mockClerkUser);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { providerUid: mockClerkUser.id },
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should create and save new user when not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const newUser = {
        providerUid: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.create.mockReturnValue(newUser);

      const result = await userService.getUserMiddleware(mockClerkUser);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { providerUid: mockClerkUser.id },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        providerUid: mockClerkUser.id,
        email: mockClerkUser.emailAddresses[0].emailAddress,
        firstName: mockClerkUser.firstName,
        lastName: mockClerkUser.lastName,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual({ ...newUser });
    });

    it('should handle missing email address', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const clerkUserWithoutEmail = {
        ...mockClerkUser,
        emailAddresses: [],
      } as unknown as ClerkUser;

      const newUser = {
        providerUid: 'clerk_123',
        email: undefined,
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.create.mockReturnValue(newUser);

      const result = await userService.getUserMiddleware(clerkUserWithoutEmail);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        providerUid: clerkUserWithoutEmail.id,
        email: undefined,
        firstName: clerkUserWithoutEmail.firstName,
        lastName: clerkUserWithoutEmail.lastName,
      });
      expect(result).toEqual({ ...newUser});
    });

    it('should handle missing first and last name', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const clerkUserWithoutNames = {
        ...mockClerkUser,
        firstName: null,
        lastName: null,
      } as unknown as ClerkUser;

      const newUser = {
        providerUid: 'clerk_123',
        email: 'test@example.com',
        firstName: '',
        lastName: '',
      };

      mockUserRepository.create.mockReturnValue(newUser);

      const result = await userService.getUserMiddleware(clerkUserWithoutNames);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        providerUid: clerkUserWithoutNames.id,
        email: clerkUserWithoutNames.emailAddresses[0].emailAddress,
        firstName: '',
        lastName: '',
      });
      expect(result).toEqual({ ...newUser});
    });
  });
}); 