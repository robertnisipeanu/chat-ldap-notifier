import ChatSub from "./ChatSub";
import ChatMessage from "./interfaces/ChatMessage";
import {Database} from "sqlite";
import UserRepository from "../database/repositories/UserRepository";
import LdapClient from "../Ldap/LdapClient";
import LdapUser from "../Ldap/LdapUser";
import LdapUserRepository from "../database/repositories/LdapUserRepository";
import {DbLdapUser} from "../database/DbLdapUser";

export default class RegisterCommand {
    private readonly chat: ChatSub;
    private readonly ldap: LdapClient;

    constructor(chat: ChatSub, ldap: LdapClient) {
        this.chat = chat;
        this.ldap = ldap;

        this.initialize();
    }

    initialize() {
        this.chat.addCommandListener("/register", this.commandHandler.bind(this));
    }

    async commandHandler(message: ChatMessage) {
        if (message.args.length < 1) {
            await message.reply("Correct syntax: /register user.name");
            return;
        }

        // Get current chat user or create one if not found
        let dbUser = await UserRepository.getByName(message.sender.name);
        if (!dbUser) {
            dbUser = await UserRepository.create({
                name: message.sender.name,
                email: message.sender.email,
                display_name: message.sender.displayName,
                space: message.space,
            });
        }

        // If failed to insert, throw error
        if (!dbUser.id) {
            await message.reply("An error occurred while saving to database");
            return;
        }

        // Get ldap user
        let ldapUser: LdapUser | undefined;

        try {
            ldapUser = await this.ldap.searchUser(message.args[0]);
        } catch (e) {
            console.log(e);
            await message.reply("An error occurred while talking to the LDAP server");
            return;
        }

        if (!ldapUser) {
            await message.reply("LDAP user not found");
            return;
        }

        await message.reply(`Found LDAP user: ${ldapUser.toString()}`);

        // Save ldap user to DB
        const dbLdapUser = await LdapUserRepository.create({
            user_id: dbUser.id,
            username: ldapUser.username,
            user_principal_name: ldapUser.userPrincipalName,
            last_logon_time: ldapUser.lastLogonTime,
            password_expiry_time: ldapUser.passwordExpiryTime,
        });

        if (!dbLdapUser.id) {
            await message.reply("An error occurred while saving to database");
            return;
        }

    }

}
