import {getDb} from "../index";
import {DbLdapUser} from "../DbLdapUser";

export default class LdapUserRepository {

    /**
     *
     * @param userid
     */
    public static async getByUserId(userid: number): Promise<DbLdapUser | undefined> {
        return await this.getByColumn('user_id', userid);
    }

    /**
     * Get a list of DbLdapUser by ldap username
     * @param username
     */
    public static async getByUsername(username: string): Promise<DbLdapUser[] | undefined> {
        return await this.getByColumnMultiple('username', username);
    }

    public static async getWhereExpiryLessThan(date: Date): Promise<DbLdapUser[] | undefined> {
        return await this.getByColumnMultiple('password_expiry_time', date, '<=');
    }

    private static async getByColumn(column: string, value: any): Promise<DbLdapUser | undefined> {
        const db = await getDb();
        return await db.get<DbLdapUser>(`SELECT id, user_id, username, user_principal_name, last_logon_time, ` +
            `password_expiry_time FROM users_ldap WHERE ${column} = :value AND deleted_at IS NULL ORDER BY id DESC`, {':value': value});
    }

    private static async getByColumnMultiple(column: string, value: any, comparator = '='): Promise<DbLdapUser[] | undefined> {
        const db = await getDb();
        return await db.all<DbLdapUser[]>(`SELECT * FROM ` +
            `(SELECT id, user_id, username, user_principal_name, last_logon_time, password_expiry_time FROM users_ldap ` +
            `WHERE ${column} ${comparator} :value AND deleted_at IS NULL ORDER BY id DESC) ul ` +
            `GROUP BY ul.user_id`, {':value': value});
    }

    /**
     * Create a new user in DB
     * @param user
     */
    public static async create(user: DbLdapUser): Promise<DbLdapUser> {
        const db = await getDb();

        // Invalidate any old ldapuser
        await this.delete(user.user_id);

        // Create new ldapuser
        const result = await db.run('INSERT INTO users_ldap (user_id, username, user_principal_name, ' +
            'last_logon_time, password_expiry_time) VALUES (:user_id, :username, :user_principal_name, ' +
            ':last_logon_time, :password_expiry_time)',
            {
                ':user_id': user.user_id,
                ':username': user.username,
                ':user_principal_name': user.user_principal_name,
                ':last_logon_time': user.last_logon_time,
                ':password_expiry_time': user.password_expiry_time,
            }
        );

        user.id = result.lastID;
        return user;
    }

    /**
     * Update an existing user from DB
     * @param user
     */
    public static async update(user: DbLdapUser): Promise<DbLdapUser> {
        const db = await getDb();

        await db.run('UPDATE users_ldap SET user_id = :user_id, username = :username, user_principal_name = :user_principal_name, ' +
            'last_logon_time = :last_logon_time, password_expiry_time = :password_expiry_time WHERE id = :id AND deleted_at is NULL',
            {
                ':id': user.id,
                ':user_id': user.user_id,
                ':username': user.username,
                ':user_principal_name': user.user_principal_name,
                ':last_logon_time': user.last_logon_time,
                ':password_expiry_time': user.password_expiry_time,
            }
        );

        return user;
    }

    /**
     * Delete all Ldap Users corresponding to user_id
     * @param userId
     */
    public static async delete(userId: number): Promise<void> {
        const db = await getDb();

        await db.run('UPDATE users_ldap SET deleted_at = :date WHERE user_id = :user_id', {':user_id': userId, ':date': new Date().getTime()});
    }

}