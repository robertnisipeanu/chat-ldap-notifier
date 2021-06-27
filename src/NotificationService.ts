import NotificationRepository from "./database/repositories/NotificationRepository";
import UserRepository from "./database/repositories/UserRepository";
import NotificationSentRepository from "./database/repositories/NotificationSentRepository";
import ChatSub from "./chat/ChatSub";
import LdapClient from "./Ldap/LdapClient";
import {formatDuration, intervalToDuration} from 'date-fns';
import LdapUser from "./Ldap/LdapUser";
import LdapUserRepository from "./database/repositories/LdapUserRepository";

export default class NotificationService {
    private readonly chat: ChatSub;
    private readonly ldap: LdapClient;

    constructor(chat: ChatSub, ldap: LdapClient) {
        this.chat = chat;
        this.ldap = ldap;

        // Run every 2.5 minutes
        setInterval(this.test.bind(this), 1000 * 60);
    }

    async test() {
        const notifications = await NotificationRepository.getAll();

        for(const notification of notifications) {

            const users = await UserRepository.getWhereNotificationNotSent(notification.send_before);

            for(const user of users) {

                // Make sure the user hasn't changed password
                const ldapUser = await this.ldap.searchUser(user.user_ldap.username);

                if (!ldapUser) continue;

                // If user changed password, reinsert new ldap user in users_ldap
                if (ldapUser.passwordExpiryTime.getTime() !== user.user_ldap.password_expiry_time.getTime()) {

                    // Save ldap user to DB
                    const dbLdapUser = await LdapUserRepository.create({
                        user_id: user.user.id,
                        username: ldapUser.username,
                        user_principal_name: ldapUser.userPrincipalName,
                        last_logon_time: ldapUser.lastLogonTime,
                        password_expiry_time: ldapUser.passwordExpiryTime,
                    });

                    continue;
                }

                // FORMAT DATE
                const duration = intervalToDuration({
                    start: user.user_ldap.password_expiry_time,
                    end: new Date()
                });

                // take the first three nonzero units
                const units = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']
                const nonzero = Object.entries(duration).filter(([_, value]) => value || 0 > 0).map(([unit, _]) => unit)

                const durationString = formatDuration(duration, {
                    format: units.filter(i => new Set(nonzero).has(i)).slice(0, 3),
                    delimiter: ', '
                });

                // Send message to user and insert in DB
                await this.chat.sendMessage(user.user.space, `Your windows password is gonna expire in: ${durationString}`);

                await NotificationSentRepository.create(user.user_ldap.id, notification.id);
            }

        }
    }



}