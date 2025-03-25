import { AppDataSource } from '../config/database';
import { User } from '../models/user.model';
// import { AppError } from '../middlewares/error.middleware';
import { User as ClerkUser } from '@clerk/express';
export class UserService {
    private UserRepository = AppDataSource.getRepository(User);

    async getUserMiddleware(clerkUser: ClerkUser): Promise<User> {
        let user = await this.UserRepository.findOne({ where: { providerUid: clerkUser.id } });

        if (!user) {
            user = this.UserRepository.create({
                providerUid: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                firstName: clerkUser.firstName ?? '',
                lastName: clerkUser.lastName?? '',
            });
            await this.UserRepository.save(user);
        }
        return user;
    }
}
