import LdapClient from "../Ldap/LdapClient";
import {PubSub} from "@google-cloud/pubsub";
import {getDb} from "../database";
import {DbUser} from "../database/DbUser";
import {DbLdapUser} from "../database/DbLdapUser";
import {chat_v1, google} from "googleapis";
import Chat = chat_v1.Chat;
import {GoogleAuth} from "google-auth-library/build/src/auth/googleauth";
import ChatMessage from "./interfaces/ChatMessage";
import {Database} from "sqlite";
import UserRepository from "../database/repositories/UserRepository";
import LdapUserRepository from "../database/repositories/LdapUserRepository";

export default class ChatSub {
    private readonly projectId: string;
    private readonly subscriptionName: string;
    private auth?: GoogleAuth;
    private client?: Chat;

    private commandListeners: {
        [key: string]: Array<(message: ChatMessage) => void>
    } = {};

    constructor(projectId = 'your-project-id', subscriptionName = 'my-sub', autoConnect = true) {
        this.projectId = projectId;
        this.subscriptionName = subscriptionName;

        if (autoConnect) {
            this.connect();
        }
    }

    connect() {
        // Connect to google chat api
        this.auth = new google.auth.GoogleAuth({
            keyFilename: `${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
            scopes: ['https://www.googleapis.com/auth/chat.bot']
        });

        this.client = new Chat({
            auth: this.auth,
        });

        this.listen();
    }

    private listen() {
        // Instantiates a client
        const pubsub = new PubSub({projectId: this.projectId});

        // Get subscription
        const subscription = pubsub.subscription(this.subscriptionName);

        subscription.on('message', this.subscriptionHandler.bind(this));

        console.log("Listening to chat messages");
    }

    private async subscriptionHandler(message: any) {
        message.ack();

        const messageObj = JSON.parse(message.data);

        if (!messageObj.space || !messageObj.space.singleUserBotDm) {
            console.log(`Got message on a space that is not a DM`, JSON.stringify(messageObj));
            return;
        }

        switch (messageObj.type) {
            case "MESSAGE":
                this.messageHandler(messageObj);
                break;
            case "ADDED_TO_SPACE":
                await this.addHandler(messageObj);
                break;
            case "REMOVED_FROM_SPACE":
                await this.removeHandler(messageObj);
                break;
            default:
                console.log("Got unknown message type", JSON.stringify(messageObj));
                break;
        }
    }

    private messageHandler(message: any) {

        const parsedArgs = message.message.text.split(" ");

        const finalMessage: ChatMessage = {
            space: message.space.name,
            sender: message.user,
            command: parsedArgs.shift(),
            args: [...parsedArgs], // Make array copy (in case of multiple listeners),
            reply: this.sendMessage.bind(this, message.space.name),
        };

        this.getCommandListeners(finalMessage.command).forEach((cmdListener) => {
            cmdListener(finalMessage);
        });
    }

    private async addHandler(message: any) {
        await this.sendMessage(message.space.name, "Welcome! To start receiving notifications before your Windows password expires, please type `/register user.name` where `user.name` is your windows username.");
    }

    private async removeHandler(message: any) {
        // Check if user exists
        const user = await UserRepository.getByName(message.user.name);
        if (!user || !user.id) return;

        // Delete user
        await LdapUserRepository.delete(user.id);
    }

    private getCommandListeners(command: string) {
        return this.commandListeners[command] ? this.commandListeners[command] : [];
    }

    public addCommandListener(command: string, listener: (message: ChatMessage) => void) {
        // Initialize listener array for command if not initialized
        if (!this.commandListeners[command]) this.commandListeners[command] = [];

        this.commandListeners[command].push(listener);
    }

    public removeCommandListener(command: string, listener: (...args: any[]) => void) {
        if (!this.commandListeners[command]) return;

        this.commandListeners[command] = this.commandListeners[command].filter((c) => c !== listener);
    }

    async sendMessage(space: string, message: string) {
        if (!this.client) {
            throw new Error("Client not connected");
        }

        await this.client.dms.messages({
            parent: space,
            requestBody: {
                text: message
            }
        });
    }

    public getClient(): Chat | undefined {
        return this.client;
    }

}