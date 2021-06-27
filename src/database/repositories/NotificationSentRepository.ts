import {getDb} from "../index";

export default class NotificationSentRepository {

    public static async getByDate(date: Date) {
        return await this.getByColumn('send_before', date);
    }

    private static async getByColumn(column: string, value: any) {
        const db = await getDb();

        return await db.get(`SELECT id, ldap_user_id, notification_id, sent_at
                             FROM ` +
            `notifications_sent WHERE ${column} = :value`, {':value': value});
    }

    public static async create(ldapUserId: number, notificationId: number) {
        const db = await getDb();

        return await db.run(`INSERT INTO notifications_sent (ldap_user_id, notification_id)
                             VALUES (:ldap_user_id, :notification_id)`,
            {
                ':ldap_user_id': ldapUserId,
                ':notification_id': notificationId,
            }
        );
    }

}