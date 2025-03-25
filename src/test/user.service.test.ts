import { UserService } from '../services/user.service';
import { AppDataSource } from '../config/database';
import { User } from '../models/user.model';
import { User as ClerkUser } from '@clerk/express';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;

  const mockClerkUser: ClerkUser = {
    id: 'clerk-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    // ...other properties
  };

  const mockUser = {
    id: 'test-user-id',
    providerUid: 'clerk-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(() => {
    mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockReturnValue(mockUser),
      save: jest.fn().mockResolvedValue(mockUser),
    };

    AppDataSource.getRepository = jest.fn().mockReturnValue(mockUserRepository);

    userService = new UserService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an existing user', async () => {
    const result = await userService.getUserMiddleware(mockClerkUser);
    expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { providerUid: 'clerk-user-id' } });
    expect(result).toEqual(mockUser);
  });

  it('should create a new user if not found', async () => {
    mockUserRepository.findOne.mockResolvedValueOnce(null);
    const result = await userService.getUserMiddleware(mockClerkUser);
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      providerUid: 'clerk-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockUser);
  });
});
