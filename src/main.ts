import dotenv from 'dotenv';
import {createTables, getDb} from './database';

dotenv.config();

import LdapClient from "./Ldap/LdapClient";
import ChatSub from "./chat/ChatSub";
import RegisterCommand from "./chat/RegisterCommand";
import NotificationRepository from "./database/repositories/NotificationRepository";
import NotificationService from "./NotificationService";


async function main() {
    const db = await getDb();

    // Create tables if not created
    await createTables(db);

    // Connect to LDAP server
    const client = new LdapClient(
        `${process.env.AD_HOST}`,
        `${process.env.AD_CN}`,
        `${process.env.AD_PASSWORD}`,
        `${process.env.AD_DN}`
    );

    await client.connect();

    const chatClient = new ChatSub('chat-notifier', 'chat-sub');
    new RegisterCommand(chatClient, client);

    // Insert at what times notifications should be sent
    const dates: Date[] = [
        new Date(1000 * 60 * 60 * 24 * 7), // 7 days
        new Date(1000 * 60 * 60 * 24 * 3), // 3 days
        new Date(1000 * 60 * 60 * 24), // 1 day
        new Date(1000 * 60 * 60), // 1 hour
        new Date(1000 * 60 * 15), // 15 minutes
    ];

    for(const date of dates) {
        await NotificationRepository.createIfNotExists(date);
    }

    new NotificationService(chatClient, client);
}

main();
