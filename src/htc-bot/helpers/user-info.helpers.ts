import { User } from "@grammyjs/types/manage";

/**
 * Получает имя пользователя или его username
 * @param user
 */
export const getUserFirstNameFrom = (user: User): string => {
    return user.first_name ?? user.username;
}