import {getDb} from "../index";

export default class NotificationRepository {

    public static async getAll() {
        const db = await getDb();

        return await db.all(`SELECT id, send_before FROM notifications ORDER BY send_before ASC`);
    }

    public static async getByDate(date: Date) {
        return await this.getByColumn('send_before', date);
    }

    private static async getByColumn(column: string, value: any) {
        const db = await getDb();

        return await db.get(`SELECT id, send_before
                             FROM ` +
            `notifications WHERE ${column} = :value`, {':value': value});
    }

    public static async create(date: Date) {
        const db = await getDb();

        return await db.run(`INSERT INTO notifications (send_before)
                             VALUES (:send_before)`,
            {':send_before': date}
        );
    }

    public static async createIfNotExists(date: Date) {
        const result = await this.getByDate(date);
        if (!result) {
            await this.create(date);
        }
    }

}