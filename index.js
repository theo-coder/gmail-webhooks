console.log("Ready")
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const hookcord = require('hookcord');
const storage = require('./storage.json');

const hook = new hookcord.Hook();

function send(author,date,subject,message) {
    hook.login(storage.webhook.id, storage.webhook.token);
    hook.setPayload({
        "content": "",
        "username":storage.webhook.name,
        "avatar_url":"https://www.stickpng.com/assets/images/5847fafdcef1014c0b5e48ce.png",
        "embeds": [
          {
            "title": ":mailbox_with_mail: - Nouveau message",
            "url": "https://mail.google.com/mail/u/0/#inbox",
            "color": 8721685,
            "fields": [
              {
                "name": ":bust_in_silhouette: - From :",
                "value": author
              },
              {
                "name": ":calendar: - Date :",
                "value": date
              },
              {
                "name": ":notepad_spiral: - Sujet :",
                "value": subject
              },
              {
                "name": ":pencil2: - Message",
                "value": message
              }
            ],
            "footer": {
              "text": "Crée par Théo Posty",
              "icon_url": "https://cdn.discordapp.com/avatars/290152300163629056/362c0fff66338b17db6acba42a01d018.png"
            }
          }
        ]
    })
    hook.fire().then(response => {
    }).catch(err=> {
        throw err;
    })
}

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('g-credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  //setInterval(() => {
    authorize(JSON.parse(content), getRecentEmail);
  //}, 5000);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function getRecentEmail(auth) {
    const gmail = google.gmail({version: 'v1', auth});
    // Only get the recent email - 'maxResults' parameter
    let nbResult = 10;
    let lastSended = [];
    setInterval(() => {
    gmail.users.messages.list({auth: auth, userId: 'me', maxResults: nbResult,}, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        
        for(let i = 0; i<nbResult;i++){
            let message_id = response['data']['messages'][i]['id']
            gmail.users.messages.get({auth: auth, userId: 'me', 'id': message_id}, function(err, response) {


                let mailArray = storage.mails
                let author = "";
                let date = "";
                let subject = "";
                let message = "";
                let messageId = response["data"]["id"];

                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }
                for(let j =0; j < response['data']['payload']['headers'].length; j++){
                    switch(response['data']['payload']['headers'][j].name){
                        case "From":
                            author = response['data']['payload']['headers'][j].value
                            break;
                        case "Date":
                            date = response['data']['payload']['headers'][j].value
                            break;
                        case "Subject":
                            subject = response['data']['payload']['headers'][j].value
                            break;
                    }
                }
                if(response['data']['payload']['parts']){
                    data = response['data']['payload']['parts'][0]['body']['data']
                    if(data){
                        buff = new Buffer.from(data, 'base64');
                        message = buff.toString();


                        //tableau js
                        for(let j=0;j<mailArray.length;j++){
                            if(author.includes(mailArray[j])){
                                if(!lastSended.includes(response["data"]["id"])){
                                    if(lastSended.length>=nbResult){
                                        lastSended.shift()
                                    }
                                    send(author,date,subject,message)
                                    lastSended.push(response["data"]["id"])
                                }
                            }
                        }
                    }
                }
            });
        }      
    });
    
    }, 20000);
}
