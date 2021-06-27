# chat-ldap-notifier

chat-ldap-notifier is a Google Chat bot that connects to your LDAP server and notifies users before their password expires.

I created this tool as Windows sometimes fails to send a notification before the password expires, specially when you need to be connected to a VPN to access the LDAP server. If you also use the LDAP password to connect to the VPN, then you won't be able to connect to VPN anymore, resulting in wasted time for you, and the IT team that needs to manually reset your password.

## Requirements
- NodeJS installed
- A Google Cloud Console account (to enable Google Chat API and PubSub). You can use the free tier, no need to add a CC to the account.
- A server/computer with access to the ldap server to run the application
- Write access to the `./data` folder for the user running the application. The app creates a SQLite database inside it to keep track of users, notifications etc.

## Setup
1. Create a project in Google Cloud Console and select it
1. Create a PubSub topic and subscription in Google Cloud Console
2. Add google's service account `chat-api-push@system.gserviceaccount.com` as member with role `Pub/Sub Publisher` to the topic created earlier
3. Enable Google Chat API in your google cloud console and fill the Configuration tab with the following:
  - `Bot name` => Display name for bot
  - `Avatar URL` => Avatar image for bot
  - `Description `=> Description for your bot
  - `Functionality`
    - Tick `Bot works in direct messages`
  - `Connection settings`
    - Choose `Cloud Pub/Sub`
    - Complete `Cloud Pub/Sub Topic Name` with full path of topic created earlier
4. Create a service account in google cloud console with `PubSub subscriber` role and download credentials as .json
5. Place the .json file from the previous step in `./secrets` folder
6. Copy `.env-sample` into `.env`
  - Put the (full)path of the json file from step 5 into `GOOGLE_APPLICATION_CREDENTIALS` environment variable
  - Complete the rest of variables from .env file
    - `AD_HOST` => IP/Hostname of your LDAP server
    - `AD_DN` => DN from LDAP where Users can be found
    - `AD_CN` => CN of user that will be used to authenticate to LDAP (used instead of username). You can get it with LDAP Admin or similar software when viewing properties of your user.
    - `AD_PASSWORD` => Password of your LDAP user
    
## Build & run
- run `npm install` to install dependencies
- run `npm run build` to build the typescript into JS
- run `node build/main.js` to start the application
- Search for your bot inside Google Chat and message it with `/register ldap.username` (replace ldap.username with your username). The bot will start to notify you before your password expires

## Contribution
If you have any improvements for the project, feel free to open a PR. 

I made the project in my free time across several days, do not expect all the code to pass quality checks or to be fully documented. I wanted to finish the project as fast as possible with little time allocated to it, run it and forget about it. Decided to publish the code as others may stumble across the same problem I had.