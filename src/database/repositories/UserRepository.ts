import {getDb} from "../index";
import {DbUser} from "../DbUser";

export default class UserRepository {

    /**
     * Get DbUser (corresponds to chat user) by nameid
     * @param name nameid (eg. 'users/1')
     */
    public static async getByName(name: string) {
        return await this.getByColumn('name', name);
    }

    private static async getByColumn(column: string, value: string) {
        const db = await getDb();
        return await db.get<DbUser>(`SELECT id, name, display_name, email, space
                                     FROM ` +
            `users WHERE ${column} = :value`, {':value': value});
    }

    /**
     * Get user that should receive notification for password expiry less then `date`.
     * If a notification was already sent for date-, user won't be returned
     * (eg. If date is 7 days and user received notification for 3 days, then the user won't be returned)
     * @param date
     */
    public static async getWhereNotificationNotSent(date: number) {
        const db = await getDb();

        const response = await db.all('SELECT u.id as u_id, u.name as u_name, ' +
            'u.display_name as u_display_name, u.email as u_email, u.space as u_space, ' +
            'lu.id as lu_id, lu.user_id as lu_user_id, lu.username as lu_username, lu.user_principal_name as lu_user_principal_name, ' +
            'lu.last_logon_time as lu_last_logon_time, lu.password_expiry_time as lu_password_expiry_time ' +
            'FROM users u ' +
            'JOIN (SELECT *, max(id) as maxid FROM users_ldap GROUP BY user_id) lu on u.id = lu.user_id ' +
            'LEFT JOIN (SELECT ns.id, ns.ldap_user_id FROM notifications_sent ns JOIN notifications n ON ns.notification_id = n.id WHERE n.send_before <= :date) AS NS ' +
            'ON ns.ldap_user_id = lu.id ' +
            'WHERE lu.password_expiry_time < :current_date + :date ' +
            'AND ns.id IS NULL',
            {
                ':date': date,
                ':current_date': new Date(),
            }
        );

        const finalResponse = response.map((r: any) => {
            return {
                user: {
                    id: r.u_id,
                    name: r.u_name,
                    display_name: r.u_display_name,
                    email: r.u_email,
                    space: r.u_space,
                },
                user_ldap: {
                    id: r.lu_id,
                    username: r.lu_username,
                    user_id: r.lu_user_id,
                    user_principal_name: r.lu_user_principal_name,
                    last_logon_time: new Date(r.lu_last_logon_time),
                    password_expiry_time: new Date(r.lu_password_expiry_time),
                }
            };
        });

        return finalResponse;
    }

    /**
     * Create a new user in DB
     * @param user
     */
    public static async create(user: DbUser): Promise<DbUser> {
        const db = await getDb();
        const result = await db.run('INSERT INTO users (name, display_name, email, space) ' +
            'VALUES (:name, :display_name, :email, :space)',
            {
                ':name': user.name,
                ':display_name': user.display_name,
                ':email': user.email,
                ':space': user.space,
            }
        );

        user.id = result.lastID;
        return user;
    }

    /**
     * Update an existing user from DB
     * @param user
     */
    public static async update(user: DbUser): Promise<DbUser> {
        const db = await getDb();

        await db.run('UPDATE users SET name = :name, display_name = :display_name, ' +
            'email = :email, space = :space WHERE id = :id',
            {
                ':id': user.id,
                ':name': user.name,
                ':display_name': user.display_name,
                ':email': user.email,
                ':space': user.space,
            }
        );

        return user;
    }

}